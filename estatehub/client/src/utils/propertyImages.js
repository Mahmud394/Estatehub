
const PHOTO_SETS = {
  house: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85',
  ],
  apartment: [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1200&q=85',
  ],
  bedroom: [
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85',
  ],
  land: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85',
  ],
};

export function getPropertyPhotos(property) {
  const text = [
    property?.title,
    property?.category,
    property?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bland\b|\bplot\b|\bplots\b|জমি/.test(text)) {
    return PHOTO_SETS.land;
  }

  if (/\boffice\b|\bcommercial\b|\bshop\b|দোকান/.test(text)) {
    return PHOTO_SETS.office;
  }

  if (/\bbedroom\b|\broom\b|\bhostel\b|\bdormitory\b/.test(text)) {
    return PHOTO_SETS.bedroom;
  }

  if (/\bapartment\b|\bflat\b|\bcondo\b/.test(text)) {
    return PHOTO_SETS.apartment;
  }

  return PHOTO_SETS.house;
}

export function getPropertyCardImage(property) {
  const url = property?.primaryImage;

  if (
    property?.isDemo ||
    !url ||
    /picsum\.photos\/seed\/estatehub-placeholder/i.test(url)
  ) {
    return getPropertyPhotos(property)[0];
  }

  return url;
}

export function getPropertyGallery(property) {
  const images = Array.isArray(property?.images)
    ? property.images
    : [];

  if (
    property?.isDemo ||
    !images.length ||
    images.every((image) =>
      /picsum\.photos\/seed\/estatehub-placeholder/i.test(image.url || '')
    )
  ) {
    return getPropertyPhotos(property).map((url, index) => ({
      id: `property-photo-${index}`,
      url,
    }));
  }

  return images;
}
