// _propiedad-data.js — datos de las páginas de propiedad (/propiedad/{slug}).
// Propiedad nueva = entrada nueva acá + fotos. Cero HTML nuevo.
// Apagar una propiedad (vendida/pausada) = activo: false → su URL redirige
// a /compradores preservando UTMs (nunca 404: quedan ads viejos apuntándole).
//
// Campos:
//   activo    true = página viva; false = redirige a /compradores
//   gancho    H1 — EL GANCHO DEL ANUNCIO, message match literal
//   precio    string ya formateado, va arriba del fold
//   ubicacion línea de ubicación visible (barrio · complejo, localidad)
//   zona      LABEL CANÓNICO para el mensaje de WhatsApp y el payload
//             (mismo set que /compradores: Canning / Berazategui / CABA)
//   specs     lista corta de características (desde el material del ad)
//   fotos     rutas de imágenes WebP (misma familia de fotos del anuncio);
//             la primera carga eager, el resto lazy
window.PROPIEDADES = {
  terralagos: {
    activo: true,
    gancho: 'El garage es el living',
    precio: 'USD 950.000',
    ubicacion: 'Terralagos, Canning',
    zona: 'Canning',
    specs: [
      'Casa en barrio privado',
      'Terralagos · Canning',
      'Garage integrado al living',
      'Consultá superficie y plantas'
    ],
    fotos: [
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg'
    ]
  },
  mag299: {
    activo: true,
    gancho: 'Pileta, galería y fondo a la laguna',
    precio: 'USD 438.000',
    ubicacion: 'Magallanes · Pueblos del Plata, Hudson',
    zona: 'Berazategui',
    specs: [
      'Casa en barrio privado',
      'Magallanes · Pueblos del Plata',
      'Pileta y galería',
      'Fondo a la laguna'
    ],
    fotos: [
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg'
    ]
  },
  gaboto: {
    activo: true,
    gancho: 'Doble altura, luz todo el día',
    precio: 'USD 340.000',
    ubicacion: 'Sebastián Gaboto · Pueblos del Plata, Hudson',
    zona: 'Berazategui',
    specs: [
      'Casa en barrio privado',
      'Sebastián Gaboto · Pueblos del Plata',
      'Living de doble altura',
      'Orientación con luz todo el día'
    ],
    fotos: [
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg',
      '/img/prop-placeholder.svg'
    ]
  }
};
