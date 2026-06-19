export function getImageSource(imageUrl) {
  if (!imageUrl) {
    return null;
  }

  const normalizedUrl = imageUrl.toLowerCase();

  if (normalizedUrl.includes('wikimedia.org') || normalizedUrl.includes('wikipedia.org')) {
    return {
      label: 'Wikimedia Commons',
      href: imageUrl,
    };
  }

  if (normalizedUrl.includes('unsplash.com')) {
    return {
      label: 'Unsplash',
      href: 'https://unsplash.com',
    };
  }

  const localSources = {
    'kamenets-tower.jpg': {
      label: 'Wikimedia Commons',
      href: 'https://commons.wikimedia.org/wiki/File:Byelaya_Vyezha_(White_Tower)_-_Kamenyets_-_Brest_Oblast_-_Belarus_-_01_(27360339172).jpg',
    },
    'ruzhany-palace.jpg': {
      label: 'Wikimedia Commons',
      href: 'https://commons.wikimedia.org/wiki/File:%D0%9F%D0%B0%D0%BB%D0%B0%D1%86_%D0%A1%D0%B0%D0%BF%D0%B5%D0%B3%D0%B0%D1%9E,_%D0%A0%D1%83%D0%B6%D0%B0%D0%BD%D1%8B.jpg',
    },
    'kupalle.jpg': {
      label: 'Wikimedia Commons',
      href: 'https://commons.wikimedia.org/wiki/File:%D0%A1ollection_of_herbs_and_flowers_for_the_Kupalle_holiday.jpg',
    },
  };

  const fileName = imageUrl.split('/').pop();
  if (localSources[fileName]) {
    return localSources[fileName];
  }

  return {
    label: 'источник',
    href: imageUrl,
  };
}
