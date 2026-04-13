export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateLoginForm({ email, motDePasse }) {
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = 'errors.required';
  } else if (!isValidEmail(email.trim())) {
    errors.email = 'errors.invalidEmail';
  }

  if (!motDePasse || !motDePasse.trim()) {
    errors.motDePasse = 'errors.required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRegisterForm({
  prenom, nom, email,
  motDePasse, confirmMotDePasse,
  telephone, wilaya, ville,
}) {
  const errors = {};

  if (!prenom?.trim())    errors.prenom    = 'errors.required';
  if (!nom?.trim())       errors.nom       = 'errors.required';
  if (!telephone?.trim()) errors.telephone = 'errors.required';
  if (!wilaya?.trim())    errors.wilaya    = 'errors.required';
  if (!ville?.trim())     errors.ville     = 'errors.required';

  if (!email?.trim()) {
    errors.email = 'errors.required';
  } else if (!isValidEmail(email.trim())) {
    errors.email = 'errors.invalidEmail';
  }

  if (!motDePasse) {
    errors.motDePasse = 'errors.required';
  } else if (motDePasse.length < 8) {
    errors.motDePasse = 'errors.passwordTooShort';
  }

  if (confirmMotDePasse && confirmMotDePasse !== motDePasse) {
    errors.confirmMotDePasse = 'errors.passwordMismatch';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}



