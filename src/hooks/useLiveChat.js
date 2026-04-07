import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Custom Hook: useLiveChat
 * 
 * Manages all Live Chat state and Supabase Realtime subscriptions:
 * - Fetches and subscribes to `pacientes` (for sidebar contact list + bot_activo toggle)
 * - Fetches and subscribes to `historial_chat` (for chat messages)
 * - Provides actions: toggleBot, sendMessage, selectChat
 */
const useLiveChat = () => {
    // ─── Core State ──────────────────────────────────────────
    const [contacts, setContacts] = useState([]); // Patients who have chatted
    const [messages, setMessages] = useState([]); // Messages for the selected chat
    const [selectedPhone, setSelectedPhone] = useState(null); // Currently selected chat phone
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [togglingBot, setTogglingBot] = useState(false);
    const [error, setError] = useState(null);
    const [showAllContacts, setShowAllContacts] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);

    // Derived: always in-sync with contacts, no separate state needed
    const manualCount = useMemo(
        () => contacts.filter(c => c.botActive === false).length,
        [contacts]
    );

    // Ref to keep the latest selectedPhone accessible in realtime callbacks
    const selectedPhoneRef = useRef(selectedPhone);
    useEffect(() => {
        selectedPhoneRef.current = selectedPhone;
    }, [selectedPhone]);

    // Ref to keep latest contacts for realtime merge
    const contactsRef = useRef(contacts);
    useEffect(() => {
        contactsRef.current = contacts;
    }, [contacts]);

    // ─── 1) Fetch Contacts (Patients with Chat History) ──────
    const fetchContacts = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoadingContacts(true);
        try {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

            // Get sessions. If !showAllContacts, only from last 24h
            // Order by created_at DESC then id DESC to break ties — the database ID always
            // reflects true insertion order, so the last inserted row wins when timestamps match.
            let query = supabase
                .from('historial_chat')
                .select('id, id_sesion, contenido, created_at, rol, tipo_mensaje, metadatos')
                .order('created_at', { ascending: false })
                .order('id', { ascending: false });

            if (!showAllContacts) {
                query = query.gte('created_at', last24h);
            }

            const { data: sessions, error: sessionsError } = await query;

            if (sessionsError) throw sessionsError;

            // Group by id_sesion to get the latest message per phone
            const sessionMap = {};
            sessions?.forEach(msg => {
                if (!sessionMap[msg.id_sesion]) {
                    sessionMap[msg.id_sesion] = {
                        lastMessage: msg.contenido,
                        lastMessageTime: msg.created_at,
                        lastMessageRole: msg.rol,
                        lastMessageType: msg.tipo_mensaje
                    };
                }
            });

            const phoneNumbers = Object.keys(sessionMap);
            if (phoneNumbers.length === 0) {
                setContacts([]);
                if (!isBackground) setLoadingContacts(false);
                return;
            }

            // Fetch patient details and bot statuses concurrently
            const [patientsRes, botStatusRes] = await Promise.all([
                supabase.from('pacientes').select('id, nombre_completo, telefono_principal, dni').in('telefono_principal', phoneNumbers),
                supabase.from('estado_bot').select('telefono, bot_activo').in('telefono', phoneNumbers)
            ]);

            if (patientsRes.error) throw patientsRes.error;
            if (botStatusRes.error) console.warn("Could not fetch estado_bot", botStatusRes.error);

            const patients = patientsRes.data || [];
            const botStatus = botStatusRes.data || [];

            // Create lookups
            const patientMap = {};
            patients?.forEach(p => {
                patientMap[p.telefono_principal] = p;
            });
            const botMap = {};
            botStatus?.forEach(b => {
                botMap[b.telefono] = b.bot_activo;
            });

            // Build contacts list
            const contactsList = phoneNumbers.map(phone => {
                const patient = patientMap[phone];
                const session = sessionMap[phone];
                return {
                    phone,
                    name: patient?.nombre_completo || phone,
                    dni: patient?.dni || '-',
                    botActive: botMap[phone] ?? true,
                    lastMessage: session.lastMessage,
                    lastMessageTime: session.lastMessageTime,
                    lastMessageRole: session.lastMessageRole,
                    lastMessageType: session.lastMessageType,
                    patientId: patient?.id || null,
                };
            });

            // Sort logic: 
            // 1. Manual chats first (botActive === false)
            // 2. Then by most recent message
            contactsList.sort((a, b) => {
                if (a.botActive !== b.botActive) {
                    return a.botActive ? 1 : -1; // false (manual) comes first
                }
                return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
            });

            setContacts(contactsList);
        } catch (err) {
            console.error('Error fetching contacts:', err);
            setError('Error al cargar los contactos');
        } finally {
            if (!isBackground) setLoadingContacts(false);
        }
    }, [showAllContacts]);

    // ─── 2) Fetch Messages for Selected Chat ────────────────
    const fetchMessages = useCallback(async (phone, loadAll = false) => {
        if (!phone) return;
        setLoadingMessages(true);
        try {
            let query = supabase
                .from('historial_chat')
                .select('*')
                .eq('id_sesion', phone)
                .order('created_at', { ascending: true });

            if (!loadAll) {
                const now = new Date();
                const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
                query = query.gte('created_at', last24h);
            }

            const { data, error: msgError } = await query;

            if (msgError) throw msgError;
            setMessages(data || []);
            setHasMoreMessages(!loadAll); // If we just loaded 24h, there might be more
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError('Error al cargar mensajes');
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    const loadFullHistory = useCallback(() => {
        if (selectedPhone) {
            fetchMessages(selectedPhone, true);
        }
    }, [selectedPhone, fetchMessages]);

    // ─── 3) Select a Chat ───────────────────────────────────
    const selectChat = useCallback((phone) => {
        setSelectedPhone(phone);
        setMessages([]);
        if (phone) {
            fetchMessages(phone);
        }
    }, [fetchMessages]);

    // ─── 4) Toggle Bot Active/Inactive ──────────────────────
    const toggleBot = useCallback(async (phone, currentValue) => {
        setTogglingBot(true);
        try {
            const newValue = !currentValue;

            const { error: updateError } = await supabase
                .from('estado_bot')
                .upsert({ telefono: phone, bot_activo: newValue, updated_at: new Date().toISOString() }, { onConflict: 'telefono' });

            if (updateError) throw updateError;

            // Optimistic update: flip botActive AND re-sort so manual contacts pin to top instantly
            setContacts(prev => {
                const updated = prev.map(c =>
                    c.phone === phone ? { ...c, botActive: newValue } : c
                );
                return [...updated].sort((a, b) => {
                    if (a.botActive !== b.botActive) return a.botActive ? 1 : -1;
                    return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
                });
            });
        } catch (err) {
            console.error('Error toggling bot:', err);
            setError('Error al cambiar estado del bot');
        } finally {
            setTogglingBot(false);
        }
    }, []);

    // ─── 5) Send Manual Message ─────────────────────────────
    const sendMessage = useCallback(async (phone, text) => {
        if (!phone || !text.trim()) return;
        setSendingMessage(true);
        setError(null);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const apiToken = import.meta.env.VITE_ADMIN_API_TOKEN;

            if (!backendUrl || !apiToken) {
                throw new Error('Configuración del backend no encontrada. Verifica VITE_BACKEND_URL y VITE_ADMIN_API_TOKEN en tu .env');
            }

            const response = await fetch(`${backendUrl}/api/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Token': apiToken,
                },
                body: JSON.stringify({
                    telefono: phone,
                    mensaje: text.trim(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.detail || `Error HTTP ${response.status}`);
            }

            // NOTE: We do NOT manually insert the message into state.
            // The backend inserts it into historial_chat, and our Realtime
            // subscription will pick it up automatically. This avoids duplicates.
        } catch (err) {
            console.error('Error sending message:', err);
            setError(`Error al enviar mensaje: ${err.message}`);
            throw err; // Re-throw so the UI can handle it
        } finally {
            setSendingMessage(false);
        }
    }, []);

    // ─── 5.5) Send Media Message ────────────────────────────
    const sendMediaMessage = useCallback(async (phone, file, caption = '') => {
        if (!phone || !file) return;
        setSendingMessage(true);
        setError(null);

        try {
            let tipo_mensaje = 'document';
            if (file.type.startsWith('image/')) tipo_mensaje = 'image';
            else if (file.type.startsWith('video/')) tipo_mensaje = 'video';

            const fileExt = file.name.split('.').pop() || 'bin';
            const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const media_path = `${phone}/${uniqueName}`;

            // Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('chats_adjuntos')
                .upload(media_path, file);

            if (uploadError) throw uploadError;

            // Trigger backend to send WhatsApp message via Graph API
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const apiToken = import.meta.env.VITE_ADMIN_API_TOKEN;

            if (!backendUrl || !apiToken) throw new Error('Configuración del backend no encontrada.');

            const response = await fetch(`${backendUrl}/api/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Token': apiToken,
                },
                body: JSON.stringify({
                    telefono: phone,
                    mensaje: caption.trim(),
                    tipo_mensaje,
                    media_path,
                    mime_type: file.type || 'application/octet-stream',
                    filename: file.name
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.detail || `Error HTTP ${response.status}`);
            }
        } catch (err) {
            console.error('Error sending media:', err);
            setError(`Error al enviar multimedia: ${err.message}`);
            throw err;
        } finally {
            setSendingMessage(false);
        }
    }, []);

    // ─── 6) Realtime Subscriptions ──────────────────────────
    useEffect(() => {
        // Initial fetch
        fetchContacts(false);

        let debounceTimer;

        // A) Subscribe to historial_chat INSERTs
        const chatChannel = supabase
            .channel('livechat:historial_chat')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'historial_chat' },
                (payload) => {
                    console.log('🟢 [LiveChat] ¡Nuevo mensaje insertado en la BD! Payload:', payload.new);
                    const newMsg = payload.new;

                    // If this message belongs to the currently selected chat, add it
                    if (newMsg.id_sesion === selectedPhoneRef.current) {
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.some(m => m.id === newMsg.id)) {
                                console.log('🟡 [LiveChat] Mensaje duplicado ignorado:', newMsg.id);
                                return prev;
                            }
                            console.log('✅ [LiveChat] Agregando mensaje al chat activo:', newMsg.contenido);
                            return [...prev, newMsg];
                        });
                    } else {
                        console.log('ℹ️ [LiveChat] Mensaje es para otro chat. Seleccionado:', selectedPhoneRef.current, 'Recibido:', newMsg.id_sesion);
                    }

                    // Refresh contacts sidebar (debounced)
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => fetchContacts(true), 800);
                }
            )
            .subscribe((status) => {
                console.log('📡 [LiveChat] Estado de la conexión de historial_chat:', status);
                if (status === 'CHANNEL_ERROR') {
                    console.error('🚨 [LiveChat] Realtime channel error for historial_chat');
                }
            });

        // B) Subscribe to estado_bot changes (for bot_activo sync)
        const statusChannel = supabase
            .channel('livechat:estado_bot')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'estado_bot' },
                (payload) => {
                    const updated = payload.new;
                    if (!updated || !updated.telefono) return;

                    // Update the bot_activo status in our contacts
                    setContacts(prev =>
                        prev.map(c =>
                            c.phone === updated.telefono
                                ? { ...c, botActive: updated.bot_activo }
                                : c
                        )
                    );
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime channel error for estado_bot');
                }
            });

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(chatChannel);
            supabase.removeChannel(statusChannel);
        };
    }, [fetchContacts]);

    // ─── Return API ─────────────────────────────────────────
    return {
        contacts,
        messages,
        selectedPhone,
        loadingContacts,
        loadingMessages,
        sendingMessage,
        togglingBot,
        error,
        setError,
        selectChat,
        toggleBot,
        sendMessage,
        sendMediaMessage,
        fetchContacts,
        showAllContacts,
        setShowAllContacts,
        hasMoreMessages,
        loadFullHistory,
        manualCount,
        // Computed: get the currently selected contact
        get selectedContact() {
            if (!selectedPhone) return null;
            const existing = contacts.find(c => c.phone === selectedPhone);
            if (existing) return existing;

            // Fallback for new chats that haven't been loaded into contacts yet
            return {
                phone: selectedPhone,
                name: selectedPhone,
                dni: '-',
                botActive: true,
                lastMessageTime: new Date().toISOString()
            };
        }
    };
};

export default useLiveChat;
