// netlify/functions/notion.js
// ─────────────────────────────────────────────────────────────
// Proxy seguro entre el sitio público y la API de Notion.
// La NOTION_KEY vive en variables de entorno de Netlify, nunca en el browser.
//
// SETUP:
// 1. En Netlify → Site settings → Environment variables → Add:
//    NOTION_KEY = secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//    (obtén tu key en https://www.notion.so/my-integrations)
// 2. Asegúrate de compartir cada base de datos con tu integración en Notion
//    (en cada DB: ··· → Connections → Connect to → tu integración)
// ─────────────────────────────────────────────────────────────

const NOTION_VERSION = '2022-06-28';

// IDs de las bases de datos en Notion
const DB = {
  iniciativas: 'b7e7bd46-a726-4671-a3ce-34aceb8364dc',
  eventos:     '3dd9dd6e-f7b0-4f79-a09d-b1e3e082d92e',
  huellas:     '47d74481-329a-43f7-ac18-055a747d1948',
  redes:       '6a6695b5-1a5f-4b2d-a91c-7599cfdeb6b6',
  textos:      'f368b5dd-7c24-4f28-9c9d-29d038bcc7ab',
  solicitudes: '00e5c86e-f1f5-433b-95a0-0c0af1a356e2',
  categorias:  '72536bb0-fd38-49bf-9cf9-094d54b92f76',
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

async function notionFetch(path, method = 'GET', body = null) {
  const key = process.env.NOTION_KEY;
  if (!key) throw new Error('NOTION_KEY no configurada en variables de entorno');
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.notion.com/v1${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error de Notion API');
  return data;
}

// ── Helpers para leer propiedades de Notion ──────────────────
function getTitle(props, key)      { return props[key]?.title?.[0]?.plain_text || ''; }
function getRichText(props, key)   { return props[key]?.rich_text?.[0]?.plain_text || ''; }
function getSelect(props, key)     { return props[key]?.select?.name || ''; }
function getMultiSelect(props, key){ return (props[key]?.multi_select || []).map(o => o.name); }
function getUrl(props, key)        { return props[key]?.url || ''; }
function getEmail(props, key)      { return props[key]?.email || ''; }
function getPhone(props, key)      { return props[key]?.phone_number || ''; }
function getNumber(props, key)     { return props[key]?.number ?? null; }
function getCheckbox(props, key)   { return props[key]?.checkbox || false; }
function getDate(props, key)       { return props[key]?.date?.start || ''; }
function getCreated(props, key)    { return props[key]?.created_time || ''; }
function getRelation(props, key)   { return (props[key]?.relation || []).map(r => r.id); }

// ── Mapear páginas de Notion a objetos limpios ───────────────
function mapIniciativa(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: getTitle(p, 'Nombre'),
    status: getSelect(p, 'Estado'),
    cat: getSelect(p, 'Categoría'),
    catIds: getRelation(p, 'Categorías'),
    desc: getRichText(p, 'Descripción'),
    prep: getRichText(p, 'Cómo preparar materiales'),
    materials: getMultiSelect(p, 'Materiales'),
    country: getRichText(p, 'País'),
    city: getRichText(p, 'Ciudad'),
    address: getRichText(p, 'Dirección completa'),
    lat: getNumber(p, 'Latitud'),
    lng: getNumber(p, 'Longitud'),
    hours: getRichText(p, 'Horario'),
    email: getEmail(p, 'Email'),
    phone: getPhone(p, 'Teléfono / WhatsApp'),
    instagram: getUrl(p, 'Instagram'),
    web: getUrl(p, 'Sitio web'),
    youtube: getUrl(p, 'YouTube'),
    emoji: getRichText(p, 'Emoji') || '♻️',
    color: getRichText(p, 'Color tarjeta') || 'linear-gradient(135deg,#2d4a1e,#4a8820)',
    createdAt: getCreated(p, 'Fecha de creación'),
  };
}

function mapEvento(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: getTitle(p, 'Nombre'),
    status: getSelect(p, 'Estado'),
    date: getDate(p, 'Fecha'),
    time: getRichText(p, 'Hora'),
    location: getRichText(p, 'Ubicación'),
    desc: getRichText(p, 'Descripción'),
    link: getUrl(p, 'Link de registro'),
    type: getSelect(p, 'Tipo'),
  };
}

function mapHuella(page) {
  const p = page.properties;
  return {
    id: page.id,
    title: getTitle(p, 'Título'),
    status: getSelect(p, 'Estado'),
    type: getSelect(p, 'Tipo'),
    cat: getSelect(p, 'Categoría relacionada'),
    desc: getRichText(p, 'Descripción'),
    link: getUrl(p, 'Link'),
    youtube: getUrl(p, 'YouTube embed'),
    date: getDate(p, 'Fecha'),
  };
}

function mapRed(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: getTitle(p, 'Red'),
    url: getUrl(p, 'URL'),
    handle: getRichText(p, 'Handle'),
    active: getCheckbox(p, 'Activo'),
  };
}

function mapTexto(page) {
  const p = page.properties;
  return {
    id: page.id,
    section: getTitle(p, 'Sección'),
    textES: getRichText(p, 'Texto ES'),
    textEN: getRichText(p, 'Texto EN'),
    subES: getRichText(p, 'Subtexto ES'),
    subEN: getRichText(p, 'Subtexto EN'),
  };
}

function mapCategoria(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: getTitle(p, 'Nombre'),
    slug: getRichText(p, 'Slug'),
    emoji: getRichText(p, 'Emoji'),
    activo: getCheckbox(p, 'Activo'),
    orden: getNumber(p, 'Orden'),
  };
}

// ── Query a una DB ───────────────────────────────────────────
async function queryDB(dbId, filter = null, sorts = null) {
  const body = {};
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;
  const data = await notionFetch(`/databases/${dbId}/query`, 'POST', body);
  return data.results || [];
}

// ── HANDLER PRINCIPAL ────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { action, id } = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    // ── GET: leer datos ──────────────────────────────────────
    if (event.httpMethod === 'GET') {
      switch (action) {

        case 'iniciativas-public': {
          const pages = await queryDB(DB.iniciativas, {
            property: 'Estado', select: { equals: 'Publicada' }
          });
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapIniciativa)) };
        }

        case 'iniciativas-all': {
          const pages = await queryDB(DB.iniciativas, null, [
            { property: 'Fecha de creación', direction: 'descending' }
          ]);
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapIniciativa)) };
        }

        case 'iniciativa': {
          if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id requerido' }) };
          const page = await notionFetch(`/pages/${id}`);
          return { statusCode: 200, headers, body: JSON.stringify(mapIniciativa(page)) };
        }

        case 'eventos-public': {
          const pages = await queryDB(DB.eventos, {
            property: 'Estado', select: { equals: 'Publicado' }
          }, [{ property: 'Fecha', direction: 'ascending' }]);
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapEvento)) };
        }

        case 'eventos-all': {
          const pages = await queryDB(DB.eventos, null, [
            { property: 'Fecha', direction: 'ascending' }
          ]);
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapEvento)) };
        }

        case 'huellas-public': {
          const pages = await queryDB(DB.huellas, {
            property: 'Estado', select: { equals: 'Publicado' }
          });
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapHuella)) };
        }

        case 'huellas-all': {
          const pages = await queryDB(DB.huellas);
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapHuella)) };
        }

        case 'redes': {
          const pages = await queryDB(DB.redes);
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapRed)) };
        }

        case 'textos': {
          const pages = await queryDB(DB.textos);
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapTexto)) };
        }

        case 'categorias': {
          const pages = await queryDB(DB.categorias, null, [
            { property: 'Orden', direction: 'ascending' }
          ]);
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapCategoria)) };
        }

        case 'categorias-public': {
          const pages = await queryDB(DB.categorias, {
            property: 'Activo', checkbox: { equals: true }
          }, [{ property: 'Orden', direction: 'ascending' }]);
          return { statusCode: 200, headers, body: JSON.stringify(pages.map(mapCategoria)) };
        }

        default:
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'action no reconocida' }) };
      }
    }

    // ── POST: crear ──────────────────────────────────────────
    if (event.httpMethod === 'POST') {

      // Formulario público de "sumar iniciativa"
      if (action === 'submit-public') {
        const props = {
          'Nombre': { title: [{ text: { content: body.name || '' } }] },
          'Estado': { select: { name: 'Borrador' } },
          'Descripción': { rich_text: [{ text: { content: body.desc || '' } }] },
          'País': { rich_text: [{ text: { content: body.country || '' } }] },
          'Ciudad': { rich_text: [{ text: { content: body.city || '' } }] },
          'Dirección completa': { rich_text: [{ text: { content: body.address || '' } }] },
          'Email': { email: body.email || null },
          'Sitio web': { url: body.web || null },
          'Instagram': { url: body.instagram || null },
        };
        if (body.cat) props['Categoría'] = { select: { name: body.cat } };
        if (body.materials?.length) props['Materiales'] = { multi_select: body.materials.map(m => ({ name: m })) };
        const page = await notionFetch('/pages', 'POST', {
          parent: { database_id: DB.solicitudes },
          properties: props,
        });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: page.id }) };
      }

      // Admin: crear iniciativa completa
      if (action === 'create-iniciativa') {
        const props = buildIniciativaProps(body);
        const page = await notionFetch('/pages', 'POST', {
          parent: { database_id: DB.solicitudes },
          properties: props,
        });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: page.id }) };
      }

      // Admin: crear evento
      if (action === 'create-evento') {
        const page = await notionFetch('/pages', 'POST', {
          parent: { database_id: DB.eventos },
          properties: buildEventoProps(body),
        });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: page.id }) };
      }

      // Admin: crear huella
      if (action === 'create-huella') {
        const page = await notionFetch('/pages', 'POST', {
          parent: { database_id: DB.huellas },
          properties: buildHuellaProps(body),
        });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: page.id }) };
      }

      // Admin: crear categoría
      if (action === 'create-categoria') {
        const page = await notionFetch('/pages', 'POST', {
          parent: { database_id: DB.categorias },
          properties: buildCategoriaProps(body),
        });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: page.id }) };
      }

      // Admin: crear red social
      if (action === 'create-red') {
        const page = await notionFetch('/pages', 'POST', {
          parent: { database_id: DB.redes },
          properties: {
            'Red': { title: [{ text: { content: body.name || '' } }] },
            'URL': { url: body.url || null },
            'Handle': { rich_text: [{ text: { content: body.handle || '' } }] },
            'Activo': { checkbox: body.active !== false },
          },
        });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: page.id }) };
      }
    }

    // ── PATCH: actualizar ────────────────────────────────────
    if (event.httpMethod === 'PATCH') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id requerido' }) };

      let props = {};
      if (action === 'update-iniciativa') props = buildIniciativaProps(body);
      if (action === 'update-evento')     props = buildEventoProps(body);
      if (action === 'update-huella')     props = buildHuellaProps(body);
      if (action === 'update-categoria')  props = buildCategoriaProps(body);
      if (action === 'update-red') {
        props = {
          'Red': { title: [{ text: { content: body.name || '' } }] },
          'URL': { url: body.url || null },
          'Handle': { rich_text: [{ text: { content: body.handle || '' } }] },
          'Activo': { checkbox: body.active !== false },
        };
      }
      if (action === 'update-texto') {
        props = {
          'Texto ES': { rich_text: [{ text: { content: body.textES || '' } }] },
          'Texto EN': { rich_text: [{ text: { content: body.textEN || '' } }] },
          'Subtexto ES': { rich_text: [{ text: { content: body.subES || '' } }] },
          'Subtexto EN': { rich_text: [{ text: { content: body.subEN || '' } }] },
        };
      }

      await notionFetch(`/pages/${id}`, 'PATCH', { properties: props });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── DELETE: archivar ─────────────────────────────────────
    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id requerido' }) };
      await notionFetch(`/pages/${id}`, 'PATCH', { archived: true });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  } catch (err) {
    console.error('Error Notion Function:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Builders de propiedades ──────────────────────────────────
function buildIniciativaProps(b) {
  const props = {
    'Nombre': { title: [{ text: { content: b.name || '' } }] },
    'Descripción': { rich_text: [{ text: { content: b.desc || '' } }] },
    'Cómo preparar materiales': { rich_text: [{ text: { content: b.prep || '' } }] },
    'País': { rich_text: [{ text: { content: b.country || '' } }] },
    'Ciudad': { rich_text: [{ text: { content: b.city || '' } }] },
    'Dirección completa': { rich_text: [{ text: { content: b.address || '' } }] },
    'Horario': { rich_text: [{ text: { content: b.hours || '' } }] },
    'Email': { email: b.email || null },
    'Teléfono / WhatsApp': { phone_number: b.phone || null },
    'Instagram': { url: b.instagram || null },
    'Sitio web': { url: b.web || null },
    'YouTube': { url: b.youtube || null },
    'Emoji': { rich_text: [{ text: { content: b.emoji || '♻️' } }] },
    'Color tarjeta': { rich_text: [{ text: { content: b.color || 'linear-gradient(135deg,#2d4a1e,#4a8820)' } }] },
  };
  if (b.cat) props['Categoría'] = { select: { name: b.cat } };
  if (b.catIds) props['Categorías'] = { relation: b.catIds.map(id => ({ id })) };
  if (b.status) props['Estado'] = { select: { name: b.status } };
  if (b.materials?.length) props['Materiales'] = { multi_select: b.materials.map(m => ({ name: m })) };
  if (b.lat != null) props['Latitud'] = { number: parseFloat(b.lat) };
  if (b.lng != null) props['Longitud'] = { number: parseFloat(b.lng) };
  return props;
}

function buildEventoProps(b) {
  const props = {
    'Nombre': { title: [{ text: { content: b.name || '' } }] },
    'Hora': { rich_text: [{ text: { content: b.time || '' } }] },
    'Ubicación': { rich_text: [{ text: { content: b.location || '' } }] },
    'Descripción': { rich_text: [{ text: { content: b.desc || '' } }] },
    'Link de registro': { url: b.link || null },
  };
  if (b.status) props['Estado'] = { select: { name: b.status } };
  if (b.type) props['Tipo'] = { select: { name: b.type } };
  if (b.date) props['Fecha'] = { date: { start: b.date } };
  return props;
}

function buildHuellaProps(b) {
  const props = {
    'Título': { title: [{ text: { content: b.title || '' } }] },
    'Descripción': { rich_text: [{ text: { content: b.desc || '' } }] },
    'Link': { url: b.link || null },
    'YouTube embed': { url: b.youtube || null },
  };
  if (b.status) props['Estado'] = { select: { name: b.status } };
  if (b.type) props['Tipo'] = { select: { name: b.type } };
  if (b.cat) props['Categoría relacionada'] = { select: { name: b.cat } };
  if (b.date) props['Fecha'] = { date: { start: b.date } };
  return props;
}

function buildCategoriaProps(b) {
  const props = {
    'Nombre': { title: [{ text: { content: b.name || '' } }] },
    'Slug': { rich_text: [{ text: { content: b.slug || '' } }] },
    'Emoji': { rich_text: [{ text: { content: b.emoji || '' } }] },
    'Activo': { checkbox: b.activo !== false },
  };
  if (b.orden != null) props['Orden'] = { number: parseFloat(b.orden) };
  return props;
}
