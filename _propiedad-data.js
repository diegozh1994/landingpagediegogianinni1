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
      '/img/prop/terralagos-01.webp',
      '/img/prop/terralagos-02.webp',
      '/img/prop/terralagos-03.webp',
      '/img/prop/terralagos-04.webp',
      '/img/prop/terralagos-05.webp',
      '/img/prop/terralagos-06.webp',
      '/img/prop/terralagos-07.webp',
      '/img/prop/terralagos-08.webp',
      '/img/prop/terralagos-09.webp',
      '/img/prop/terralagos-10.webp',
      '/img/prop/terralagos-11.webp',
      '/img/prop/terralagos-12.webp',
      '/img/prop/terralagos-13.webp',
      '/img/prop/terralagos-14.webp',
      '/img/prop/terralagos-15.webp',
      '/img/prop/terralagos-16.webp',
      '/img/prop/terralagos-17.webp',
      '/img/prop/terralagos-18.webp',
      '/img/prop/terralagos-19.webp'
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
      '/img/prop/mag299-01.webp',
      '/img/prop/mag299-02.webp',
      '/img/prop/mag299-03.webp',
      '/img/prop/mag299-04.webp',
      '/img/prop/mag299-05.webp',
      '/img/prop/mag299-06.webp',
      '/img/prop/mag299-07.webp',
      '/img/prop/mag299-08.webp',
      '/img/prop/mag299-09.webp',
      '/img/prop/mag299-10.webp',
      '/img/prop/mag299-11.webp',
      '/img/prop/mag299-12.webp',
      '/img/prop/mag299-13.webp',
      '/img/prop/mag299-14.webp'
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
      '/img/prop/gaboto-01.webp',
      '/img/prop/gaboto-02.webp',
      '/img/prop/gaboto-03.webp',
      '/img/prop/gaboto-04.webp',
      '/img/prop/gaboto-05.webp',
      '/img/prop/gaboto-06.webp',
      '/img/prop/gaboto-07.webp',
      '/img/prop/gaboto-08.webp',
      '/img/prop/gaboto-09.webp',
      '/img/prop/gaboto-10.webp',
      '/img/prop/gaboto-11.webp',
      '/img/prop/gaboto-12.webp',
      '/img/prop/gaboto-13.webp',
      '/img/prop/gaboto-14.webp',
      '/img/prop/gaboto-15.webp'
    ]
  }
};
