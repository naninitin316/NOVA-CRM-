const INDIA_COUNTRY_CODE = '91';

export const getWhatsAppUrl = (phone?: string | null) => {
  const digits = phone?.replace(/\D/g, '') || '';
  if (!digits) return null;

  const withoutLeadingZeroes = digits.replace(/^0+/, '');
  const normalized =
    withoutLeadingZeroes.length === 10
      ? `${INDIA_COUNTRY_CODE}${withoutLeadingZeroes}`
      : withoutLeadingZeroes.length > 10 && withoutLeadingZeroes.startsWith(INDIA_COUNTRY_CODE)
        ? withoutLeadingZeroes
        : withoutLeadingZeroes.length > 10
          ? `${INDIA_COUNTRY_CODE}${withoutLeadingZeroes.slice(-10)}`
          : withoutLeadingZeroes;

  return normalized.length >= 10 ? `https://wa.me/${normalized}` : null;
};
