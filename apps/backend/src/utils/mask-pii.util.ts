export function maskPii(data: any): any {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => maskPii(item));
  }
  
  const masked = { ...data };
  
  // Mask email
  if (masked.email && typeof masked.email === 'string') {
    const [local, domain] = masked.email.split('@');
    if (domain) {
      masked.email = `${local.substring(0, 2)}***@${domain}`;
    }
  }
  
  // Mask phone
  if (masked.phone && typeof masked.phone === 'string') {
    masked.phone = `${masked.phone.substring(0, 2)}******${masked.phone.substring(masked.phone.length - 2)}`;
  }
  
  if (masked.address) masked.address = '***MASKED***';
  if (masked.photoUrl) masked.photoUrl = '***MASKED***';
  
  // Deep mask nested objects (like guardians)
  for (const key of Object.keys(masked)) {
    if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskPii(masked[key]);
    }
  }
  
  return masked;
}
