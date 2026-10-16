import { supabase } from '../supabaseClient';
import { createPrescription } from './prescriptionService';
import { createSalesReceipt } from './salesReceiptService';
import { createLaboratoryOrder } from './laboratoryService';

// Carga de datos ficticios para la demo. Se usa desde Configuración (solo ADMIN)
// con la sesión del usuario, así que respeta las mismas reglas de acceso que el panel.
// Es idempotente: si ya existe el producto marcador, no vuelve a cargar nada.

const DEMO_MARKER_SKU = 'DEMO-PARA-500';

const PATIENTS = [
    { dni: '70214563', nombre_completo: 'MARÍA FERNANDA QUISPE ROJAS', fecha_nacimiento: '1989-03-12', telefono_principal: '987654321' },
    { dni: '45781236', nombre_completo: 'JOSÉ LUIS RAMÍREZ TORRES', fecha_nacimiento: '1975-07-15', telefono_principal: '976543210' },
    { dni: '72563914', nombre_completo: 'CAMILA ANDREA FLORES MENDOZA', fecha_nacimiento: '1996-11-23', telefono_principal: '965432109' },
    { dni: '40987321', nombre_completo: 'PEDRO ANTONIO CHÁVEZ VARGAS', fecha_nacimiento: '1962-01-05', telefono_principal: '954321098' },
    { dni: '76345128', nombre_completo: 'VALERIA SOFÍA GUTIÉRREZ SALAS', fecha_nacimiento: '2001-08-30', telefono_principal: '943210987' },
    { dni: '43218765', nombre_completo: 'MIGUEL ÁNGEL CASTILLO NÚÑEZ', fecha_nacimiento: '1983-04-18', telefono_principal: '932109876' },
    { dni: '71123459', nombre_completo: 'LUCÍA ISABEL MORALES PAREDES', fecha_nacimiento: '1992-09-09', telefono_principal: '921098765' },
    { dni: '41567893', nombre_completo: 'JORGE ENRIQUE DÍAZ HUAMÁN', fecha_nacimiento: '1958-02-27', telefono_principal: '910987654' },
    { dni: '74892316', nombre_completo: 'DANIELA PATRICIA VEGA CÓRDOVA', fecha_nacimiento: '1999-06-14', telefono_principal: '998877665' },
    { dni: '46239871', nombre_completo: 'RICARDO MANUEL SILVA ARAUJO', fecha_nacimiento: '1970-12-03', telefono_principal: '987123456' },
    { dni: '73651248', nombre_completo: 'ANDREA CAROLINA REYES LÓPEZ', fecha_nacimiento: '1994-10-21', telefono_principal: '976234567' },
    { dni: '42876543', nombre_completo: 'CARLOS ALBERTO MENDOZA RUIZ', fecha_nacimiento: '1966-05-11', telefono_principal: '965345678' },
];

const INVENTORY = [
    { sku: DEMO_MARKER_SKU, nombre: 'Paracetamol 500 mg', categoria: 'Medicamentos', unidad_medida: 'Unidades', principio_activo: 'Paracetamol', stock: 240, stock_minimo: 50, costo_compra: 0.15, precio_venta: 0.5, vence: 420 },
    { sku: 'DEMO-IBU-400', nombre: 'Ibuprofeno 400 mg', categoria: 'Medicamentos', unidad_medida: 'Unidades', principio_activo: 'Ibuprofeno', stock: 180, stock_minimo: 40, costo_compra: 0.2, precio_venta: 0.8, vence: 300 },
    { sku: 'DEMO-AMOX-500', nombre: 'Amoxicilina 500 mg', categoria: 'Medicamentos', unidad_medida: 'Unidades', principio_activo: 'Amoxicilina', stock: 35, stock_minimo: 40, costo_compra: 0.35, precio_venta: 1.2, vence: 200 },
    { sku: 'DEMO-OME-20', nombre: 'Omeprazol 20 mg', categoria: 'Medicamentos', unidad_medida: 'Unidades', principio_activo: 'Omeprazol', stock: 120, stock_minimo: 30, costo_compra: 0.25, precio_venta: 0.9, vence: 25 },
    { sku: 'DEMO-LOS-50', nombre: 'Losartán 50 mg', categoria: 'Medicamentos', unidad_medida: 'Unidades', principio_activo: 'Losartán potásico', stock: 150, stock_minimo: 30, costo_compra: 0.3, precio_venta: 1.0, vence: 500 },
    { sku: 'DEMO-GUA-M', nombre: 'Guantes de látex (talla M)', categoria: 'Material Médico Estéril', unidad_medida: 'Cajas', principio_activo: null, stock: 12, stock_minimo: 5, costo_compra: 18, precio_venta: 0, vence: 700 },
];

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };
// Siguiente día hábil (lunes a viernes) a partir de hoy + offset
const weekday = (offset) => {
    const d = addDays(offset);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return isoDate(d);
};
const ageOf = (birth) => `${Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 24 * 3600 * 1000))} años`;
const fail = (step, error) => { throw new Error(`${step}: ${error?.message || error}`); };

export const seedDemoData = async (onProgress = () => { }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    const { data: marker } = await supabase.from('inventory_items').select('id').eq('sku', DEMO_MARKER_SKU).maybeSingle();
    if (marker) return { alreadyLoaded: true };

    // 1. Pacientes (solo los que falten)
    onProgress('Pacientes');
    const { data: existing, error: pErr } = await supabase.from('pacientes').select('id, dni').in('dni', PATIENTS.map((p) => p.dni));
    if (pErr) fail('Pacientes', pErr);
    const missing = PATIENTS.filter((p) => !existing.some((e) => e.dni === p.dni));
    if (missing.length) {
        const { error } = await supabase.from('pacientes').insert(missing);
        if (error) fail('Pacientes', error);
    }
    const { data: patients } = await supabase.from('pacientes').select('*').in('dni', PATIENTS.map((p) => p.dni));
    const byDni = Object.fromEntries((patients || []).map((p) => [p.dni, p]));
    const P = PATIENTS.map((p) => byDni[p.dni]);
    if (P.some((p) => !p)) fail('Pacientes', 'no se pudieron leer los pacientes registrados');

    // 2. Doctores (los que ya existen en la clínica)
    const { data: doctors } = await supabase.from('doctores').select('*').eq('activo', true);
    const mainDoc = doctors?.find((d) => d.es_principal) || doctors?.[0] || {};
    const secondDoc = doctors?.find((d) => d.id !== mainDoc.id) || mainDoc;
    const docHeader = (d) => ({
        medico_nombre: d.nombre_completo ? `Dr./Dra. ${d.nombre_completo}` : null,
        medico_cmp: d.cmp || null,
        medico_especialidad: d.especialidad || null,
    });

    // 3. Inventario: el stock entra como movimiento de INGRESO (queda en el kardex)
    onProgress('Inventario');
    const inv = {};
    for (const it of INVENTORY) {
        const { data: item, error } = await supabase.from('inventory_items').insert([{
            sku: it.sku, nombre: it.nombre, categoria: it.categoria, unidad_medida: it.unidad_medida,
            principio_activo: it.principio_activo, stock_actual: 0, stock_minimo: it.stock_minimo,
            costo_compra: it.costo_compra, precio_venta: it.precio_venta, proveedor: 'Distribuidora Demo S.A.C.',
            lote: `L${it.sku.slice(-3)}26`, fecha_vencimiento: isoDate(addDays(it.vence)),
        }]).select().single();
        if (error) fail('Inventario', error);
        await supabase.from('inventory_movements').insert({ item_id: item.id, tipo: 'INGRESO', cantidad: it.stock, motivo: 'Stock inicial', usuario_id: userId });
        inv[it.sku] = item;
    }

    // 4. Citas: confirmar algunas de hoy y agregar citas agendadas por el bot
    onProgress('Citas');
    const today = isoDate(new Date());
    const { data: todays } = await supabase.from('citas').select('id').eq('fecha', today).eq('estado', 'PENDIENTE').order('hora').limit(3);
    if (todays?.length) await supabase.from('citas').update({ estado: 'CONFIRMADA' }).in('id', todays.map((c) => c.id));
    const botAppointments = [
        { p: 4, fecha: weekday(1), hora: '12:10', motivo: 'Dolor de cabeza frecuente' },
        { p: 8, fecha: weekday(2), hora: '12:30', motivo: 'Control de presión arterial' },
        { p: 0, fecha: weekday(3), hora: '12:50', motivo: 'Resultados de análisis' },
        { p: 6, fecha: weekday(5), hora: '13:10', motivo: 'Chequeo general' },
        { p: 3, fecha: weekday(6), hora: '16:20', motivo: 'Control cardiológico' },
        { p: 10, fecha: weekday(8), hora: '11:50', motivo: 'Dolor abdominal' },
    ];
    for (const a of botAppointments) {
        const { data: taken } = await supabase.from('citas').select('id').eq('fecha', a.fecha).eq('hora', a.hora).neq('estado', 'CANCELADA');
        if (taken?.length) continue;
        await supabase.from('citas').insert([{ paciente_id: P[a.p].id, fecha: a.fecha, hora: a.hora, estado: 'PENDIENTE', origen: 'BOT', motivo_consulta: a.motivo }]);
    }

    // 5. Recetas
    onProgress('Recetas');
    const recetas = [
        { p: 1, doc: mainDoc, diagnostico: 'Faringitis aguda', items: [
            { sku: 'DEMO-AMOX-500', concentracion: '500 mg', via: 'Oral', dosis: '1 cápsula', frecuencia: 'Cada 8 horas', duracion: '7 días' },
            { sku: DEMO_MARKER_SKU, concentracion: '500 mg', via: 'Oral', dosis: '1 tableta', frecuencia: 'Cada 8 horas si hay fiebre', duracion: '3 días' }] },
        { p: 3, doc: secondDoc, diagnostico: 'Hipertensión arterial esencial', items: [
            { sku: 'DEMO-LOS-50', concentracion: '50 mg', via: 'Oral', dosis: '1 tableta', frecuencia: 'Cada 24 horas', duracion: '30 días' }] },
        { p: 2, doc: mainDoc, diagnostico: 'Gastritis aguda', items: [
            { sku: 'DEMO-OME-20', concentracion: '20 mg', via: 'Oral', dosis: '1 cápsula en ayunas', frecuencia: 'Cada 24 horas', duracion: '14 días' }] },
    ];
    for (const r of recetas) {
        const pt = P[r.p];
        const { error } = await createPrescription({
            fecha: today, ...docHeader(r.doc), paciente_id: pt.id, paciente_nombre: pt.nombre_completo,
            paciente_dni: pt.dni, paciente_edad: ageOf(pt.fecha_nacimiento), diagnostico: r.diagnostico,
            observaciones: 'Abundante líquido y reposo relativo.', proxima_cita: weekday(10),
        }, r.items.map((i) => ({
            inventory_item_id: inv[i.sku].id, medicamento: inv[i.sku].nombre, concentracion: i.concentracion,
            via_administracion: i.via, dosis: i.dosis, frecuencia: i.frecuencia, duracion: i.duracion,
        })), userId);
        if (error) fail('Recetas', error);
    }

    // 6. Boletas de venta
    onProgress('Boletas');
    const boletas = [
        { p: 1, items: [
            { tipo: 'SERVICIO', descripcion: 'Consulta de Medicina General', cantidad: 1, precio_unitario: 80 },
            { tipo: 'INVENTARIO', sku: 'DEMO-AMOX-500', cantidad: 21, precio_unitario: 1.2 }] },
        { p: 3, items: [{ tipo: 'SERVICIO', descripcion: 'Consulta de Cardiología', cantidad: 1, precio_unitario: 120 }] },
        { p: 2, items: [
            { tipo: 'SERVICIO', descripcion: 'Consulta de Medicina General', cantidad: 1, precio_unitario: 80 },
            { tipo: 'INVENTARIO', sku: 'DEMO-OME-20', cantidad: 14, precio_unitario: 0.9 }] },
    ];
    for (const b of boletas) {
        const pt = P[b.p];
        const { error } = await createSalesReceipt(
            { paciente_id: pt.id, paciente_nombre: pt.nombre_completo, paciente_dni: pt.dni },
            b.items.map((i) => ({
                tipo: i.tipo, inventory_item_id: i.sku ? inv[i.sku].id : null,
                descripcion: i.sku ? inv[i.sku].nombre : i.descripcion, cantidad: i.cantidad,
                precio_unitario: i.precio_unitario, subtotal: +(i.cantidad * i.precio_unitario).toFixed(2),
            })), userId);
        if (error) fail('Boletas', error);
    }

    // 7. Órdenes de laboratorio
    onProgress('Laboratorio');
    const ordenes = [
        { p: 3, doc: secondDoc, sospecha: 'Dislipidemia', examenes: [['Perfil lipídico', 'Sangre'], ['Glucosa en ayunas', 'Sangre']] },
        { p: 0, doc: mainDoc, sospecha: 'Anemia', examenes: [['Hemograma completo', 'Sangre'], ['Examen completo de orina', 'Orina']] },
    ];
    for (const o of ordenes) {
        const pt = P[o.p];
        const { error } = await createLaboratoryOrder({
            fecha: today, ...docHeader(o.doc), medico_rne: o.doc.rne || null, paciente_id: pt.id,
            paciente_nombre: pt.nombre_completo, paciente_dni: pt.dni, paciente_edad: ageOf(pt.fecha_nacimiento),
            sospecha_clinica: o.sospecha, observaciones: 'Acudir en ayunas de 12 horas.',
        }, o.examenes.map(([examen, tipo_muestra]) => ({ examen, tipo_muestra })), userId);
        if (error) fail('Laboratorio', error);
    }

    // 8. Historia clínica
    onProgress('Historia clínica');
    const historias = [
        [1, '**Motivo:** dolor de garganta y fiebre de 2 días.\n\n**Examen:** faringe congestiva, sin placas. T° 38.2 °C.\n\n**Diagnóstico:** faringitis aguda.\n\n**Plan:** amoxicilina 500 mg c/8h por 7 días, paracetamol si hay fiebre.'],
        [3, '**Motivo:** control de presión arterial.\n\n**Examen:** PA 150/95 mmHg, FC 78 lpm.\n\n**Diagnóstico:** hipertensión arterial esencial.\n\n**Plan:** losartán 50 mg diario, dieta baja en sal, perfil lipídico.'],
        [2, '**Motivo:** ardor epigástrico después de las comidas.\n\n**Examen:** dolor leve a la palpación en epigastrio.\n\n**Diagnóstico:** gastritis aguda.\n\n**Plan:** omeprazol 20 mg en ayunas por 14 días.'],
    ];
    for (const [p, historia] of historias) {
        const { error } = await supabase.from('historial_clinico').insert([{ dni_paciente: P[p].dni, historia, estado_cerrado: true }]);
        if (error) fail('Historia clínica', error);
    }

    // 9. Notificaciones y conversaciones del bot (pueden fallar si la base no lo permite)
    onProgress('Notificaciones y chat');
    const notes = [];
    const { error: nErr } = await supabase.from('notificaciones').insert([
        { tipo: 'URGENCIA', mensaje: 'Paciente reporta dolor de pecho intenso desde hace 1 hora. Solicita atención urgente.', telefono_paciente: P[7].telefono_principal },
        { tipo: 'ALERTA_BOT', mensaje: 'Paciente solicita reprogramar su cita para la próxima semana.', telefono_paciente: P[4].telefono_principal },
        { tipo: 'ALERTA_BOT', mensaje: 'Paciente consulta por resultados de laboratorio.', telefono_paciente: P[0].telefono_principal },
        { tipo: 'ALERTA_BOT', mensaje: 'Paciente pregunta por precio de consulta de cardiología.', telefono_paciente: P[9].telefono_principal, leido: true, completado: true },
    ]);
    if (nErr) notes.push('notificaciones');
    const chats = [
        [P[4].telefono_principal, [['user', 'Hola, quisiera agendar una cita por dolor de cabeza'], ['model', '¡Hola! Con gusto te ayudo. ¿Me indicas tu DNI, por favor?'], ['user', P[4].dni], ['model', `Gracias, Valeria. Te agendé con la Dra. para el ${weekday(1)} a las 12:10. ¿Te confirmo?`], ['user', 'Sí, perfecto, gracias']]],
        [P[7].telefono_principal, [['user', 'Buenas, tengo un dolor fuerte en el pecho'], ['model', 'Lamento lo que sientes. Si el dolor es intenso, acude a emergencias de inmediato. Ya avisé al personal de la clínica para que te contacte.']]],
        [P[0].telefono_principal, [['user', '¿Ya están mis resultados de laboratorio?'], ['model', 'Voy a consultarlo con el personal de la clínica y te escribimos en breve.']]],
    ];
    for (const [phone, msgs] of chats) {
        const base = Date.now() - msgs.length * 60000;
        const { error } = await supabase.from('historial_chat').insert(msgs.map(([rol, contenido], i) => ({
            id_sesion: phone, rol, contenido, tipo_mensaje: 'text', created_at: new Date(base + i * 60000).toISOString(),
        })));
        if (error) { notes.push('chat'); break; }
    }

    return { alreadyLoaded: false, skipped: notes };
};
