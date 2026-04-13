/**
 * Calcul du prix estimé UCOLIS
 * Formule : Prix = (distance × PRIX_KM) + (poids × PRIX_KG) + (volume × PRIX_M3)
 * Distance calculée via la formule de Haversine (distance à vol d'oiseau × 1.3)
 */

const COEFFICIENTS = {
  PRIX_PAR_KM:  12,
  PRIX_PAR_KG:  50,
  PRIX_PAR_M3:  200,
  ROUTE_FACTOR: 1.3,
};

/**
 * Distance Haversine entre deux coordonnées GPS
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 * @returns {number} distance en km
 */
export function haversineDistance(a, b) {
  if (!a || !b) return 0;
  const R    = 6371; // Rayon Terre en km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const hav  =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(hav));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Volume d'un colis en m³
 */
export function computeVolume(longueur, largeur, hauteur) {
  return parseFloat(((longueur * largeur * hauteur) / 1_000_000).toFixed(4));
}

/**
 * Calcul complet : distance, volume et prix
 * @returns {{ distance: number, volume: number, prix: number }}
 */
export function computeFullPrice(coordDepart, coordArrivee, poids, longueur, largeur, hauteur) {
  const distRaw  = haversineDistance(coordDepart, coordArrivee);
  const distance = parseFloat((distRaw * COEFFICIENTS.ROUTE_FACTOR).toFixed(1));
  const volume   = computeVolume(longueur || 0, largeur || 0, hauteur || 0);

  const prix = Math.round(
    distance * COEFFICIENTS.PRIX_PAR_KM +
    (poids || 0) * COEFFICIENTS.PRIX_PAR_KG +
    volume * COEFFICIENTS.PRIX_PAR_M3
  );

  return { distance, volume, prix, coefficients: COEFFICIENTS };
}

export { COEFFICIENTS };
