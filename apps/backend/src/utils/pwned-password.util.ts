import * as crypto from 'crypto';

export async function checkPwnedPassword(password: string): Promise<boolean> {
  // Hash the password with SHA-1
  const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) {
      // If the API fails, we fail open so users can still reset passwords
      console.warn(`[HIBP API Error] Status: ${response.status}`);
      return false;
    }

    const text = await response.text();
    // The API returns lines of `SUFFIX:COUNT`
    return text.includes(suffix);
  } catch (error) {
    console.error('[HIBP Check Failed]', error);
    return false;
  }
}
