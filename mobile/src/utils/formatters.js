import moment from 'moment';

// ✅ Locale configurée via l'API — pas besoin d'import séparé
moment.updateLocale('fr', {
  relativeTime: {
    future: 'dans %s',
    past:   'il y a %s',
    s:      'quelques secondes',
    ss:     '%d secondes',
    m:      'une minute',
    mm:     '%d minutes',
    h:      'une heure',
    hh:     '%d heures',
    d:      'un jour',
    dd:     '%d jours',
    M:      'un mois',
    MM:     '%d mois',
    y:      'un an',
    yy:     '%d ans',
  },
  months: ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
  monthsShort: ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'],
  weekdays: ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],
});

moment.locale('fr');

export function formatPrice(price) {
  if (price == null || isNaN(price)) return '— DZD';
  return `${Number(price).toLocaleString('fr-DZ')} DZD`;
}

export function formatWeight(kg) {
  if (kg == null || isNaN(kg)) return '— kg';
  return `${kg} kg`;
}

export function formatDistance(km) {
  if (km == null || isNaN(km)) return '— km';
  return `${Math.round(km)} km`;
}

export function formatRelativeDate(date) {
  if (!date) return '';
  return moment(date).fromNow();
}

export function formatShortDate(date) {
  if (!date) return '';
  return moment(date).format('D MMM YYYY');
}

export function formatTime(date) {
  if (!date) return '';
  return moment(date).format('HH:mm');
}

export function truncate(str, n = 80) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '...' : str;
}
