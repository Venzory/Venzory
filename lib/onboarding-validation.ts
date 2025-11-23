import { z } from 'zod';

export const ONBOARDING_COUNTRIES = ['NL', 'BE', 'DE', 'UK'] as const;
export type OnboardingCountry = (typeof ONBOARDING_COUNTRIES)[number];

type CountryConfig = {
  label: string;
  postalCode: {
    regex: RegExp;
    example: string;
    normalize: (value: string) => string;
  };
  phoneDialCode: string;
  minPhoneDigits: number;
  maxPhoneDigits: number;
};

const removeWhitespace = (value: string) => value.replace(/\s+/g, '');

const normalizeHouseNumber = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizeNlPostal = (value: string) => removeWhitespace(value).toUpperCase();
const normalizeBePostal = (value: string) => removeWhitespace(value);
const normalizeDePostal = (value: string) => removeWhitespace(value);
const normalizeUkPostal = (value: string) => {
  const compact = removeWhitespace(value).toUpperCase();
  if (compact.length <= 3) {
    return compact;
  }
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
};

export const ONBOARDING_COUNTRY_CONFIG: Record<OnboardingCountry, CountryConfig> = {
  NL: {
    label: 'Netherlands',
    postalCode: {
      regex: /^[0-9]{4}\s?[A-Za-z]{2}$/,
      example: '1234AB',
      normalize: normalizeNlPostal,
    },
    phoneDialCode: '+31',
    minPhoneDigits: 8,
    maxPhoneDigits: 12,
  },
  BE: {
    label: 'Belgium',
    postalCode: {
      regex: /^[0-9]{4}$/,
      example: '1000',
      normalize: normalizeBePostal,
    },
    phoneDialCode: '+32',
    minPhoneDigits: 8,
    maxPhoneDigits: 12,
  },
  DE: {
    label: 'Germany',
    postalCode: {
      regex: /^[0-9]{5}$/,
      example: '10115',
      normalize: normalizeDePostal,
    },
    phoneDialCode: '+49',
    minPhoneDigits: 9,
    maxPhoneDigits: 13,
  },
  UK: {
    label: 'United Kingdom',
    postalCode: {
      regex:
        /^(GIR ?0AA|(?:(?:[A-Z][0-9]{1,2})|(?:[A-Z][A-HJ-Y][0-9]{1,2})|(?:[A-Z][0-9][A-Z])|(?:[A-Z][A-HJ-Y][0-9](?:[0-9ABEHMNPRVWXY])))[ ]?[0-9][A-Z]{2})$/i,
      example: 'SW1A 1AA',
      normalize: normalizeUkPostal,
    },
    phoneDialCode: '+44',
    minPhoneDigits: 10,
    maxPhoneDigits: 13,
  },
};

const trimAndCollapse = (value: string) => value.trim().replace(/\s+/g, ' ');

const sanitizePhoneValue = (value: string) => value.replace(/[\s()-]/g, '');

export const practiceDetailsSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Practice name is required')
      .max(100, 'Practice name is too long')
      .transform((value) => trimAndCollapse(value)),
    street: z
      .string()
      .min(1, 'Street is required')
      .max(200, 'Street is too long')
      .transform((value) => trimAndCollapse(value)),
    houseNumber: z
      .string()
      .min(1, 'House number is required')
      .max(10, 'House number is too long')
      .transform((value) => normalizeHouseNumber(value)),
    postalCode: z
      .string()
      .min(1, 'Postal code is required')
      .max(10, 'Postal code is too long')
      .transform((value) => trimAndCollapse(value).toUpperCase()),
    city: z
      .string()
      .min(1, 'City is required')
      .max(100, 'City is too long')
      .transform((value) => trimAndCollapse(value)),
    country: z.enum(ONBOARDING_COUNTRIES, 'Select a country'),
    contactEmail: z
      .string()
      .min(1, 'Contact email is required')
      .email('Enter a valid email address')
      .max(255, 'Contact email is too long')
      .transform((value) => value.trim()),
    contactPhone: z
      .string()
      .min(1, 'Phone number is required')
      .max(25, 'Phone number is too long')
      .transform((value) => trimAndCollapse(value)),
  })
  .superRefine((data, ctx) => {
    const config = ONBOARDING_COUNTRY_CONFIG[data.country];

    if (!config) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unsupported country selected',
        path: ['country'],
      });
      return;
    }

    const normalizedPostal = config.postalCode.normalize(data.postalCode);
    if (!config.postalCode.regex.test(normalizedPostal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Postal code must match the format ${config.postalCode.example}`,
        path: ['postalCode'],
      });
    } else {
      // eslint-disable-next-line no-param-reassign
      (data as any).postalCode = normalizedPostal;
    }

    const compactPhone = sanitizePhoneValue(data.contactPhone);
    if (!compactPhone.startsWith(config.phoneDialCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Phone number must start with ${config.phoneDialCode}`,
        path: ['contactPhone'],
      });
      return;
    }

    const digitsOnly = compactPhone.slice(config.phoneDialCode.length).replace(/\D/g, '');
    if (
      digitsOnly.length < config.minPhoneDigits ||
      digitsOnly.length > config.maxPhoneDigits
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Phone number must include between ${config.minPhoneDigits} and ${config.maxPhoneDigits} digits after the country code`,
        path: ['contactPhone'],
      });
      return;
    }

    const normalizedPhone = `${config.phoneDialCode} ${digitsOnly}`;
    // eslint-disable-next-line no-param-reassign
    (data as any).contactPhone = normalizedPhone;
  });

export type PracticeDetailsInput = z.infer<typeof practiceDetailsSchema>;

