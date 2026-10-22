/**
 * Field Edit Permissions Utility for WEmanipur
 *
 * Rules:
 * - If explicit fieldList is provided (non-empty array/string):
 *   ONLY the fields and sections matching keys in fieldList can be edited.
 * - If fieldList is empty/null:
 *   - If loanStatus is 'rejected', 'submitted', 'under_review', 'approved': read-only (false)
 *   - If loanStatus is 'inprogress', 'draft', or initial: editable (true)
 *
 * Supported Section Keys (from API fieldList):
 * - "aadharEntry"
 * - "aadharVerify"
 * - "personal"
 * - "address"
 * - "loanSHG"
 * - "familyIncome"
 * - "economyActivity"
 * - "loanDetails"
 * - "bankDetails"
 * - "document"
 * - "review"
 * - "acknowledgement"
 *
 * Supported Granular Field Keys:
 * - "name", "dob", "gender", "category", "email", "phone", "aadhaarNo", "photo"
 * - "shgName", "shgId", "dateOfFormation", "certificate", "bankCopy"
 * - "locality", "panchayat", "district"
 * - "familyIncome"
 * - "economicActivity", "descriptionOfProposedActivity"
 * - "declearedName", "declearedGuardianName"
 */

export const parseFieldList = (rawFieldList?: any): string[] => {
  if (!rawFieldList) return [];

  let fields: string[] = [];

  if (Array.isArray(rawFieldList)) {
    fields = rawFieldList.map(item => {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object' && item !== null) {
        return (
          item.field ||
          item.name ||
          item.key ||
          item.fieldName ||
          ''
        ).trim();
      }
      return String(item).trim();
    });
  } else if (typeof rawFieldList === 'string') {
    const trimmed = rawFieldList.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          fields = parsed.map(f => String(f).trim());
        }
      } catch {
        fields = trimmed.split(',').map(s => s.trim());
      }
    } else {
      fields = trimmed.split(',').map(s => s.trim());
    }
  } else if (typeof rawFieldList === 'object' && rawFieldList !== null) {
    fields = Object.keys(rawFieldList)
      .filter(k => Boolean(rawFieldList[k]))
      .map(k => k.trim());
  }

  return fields.filter(Boolean);
};

export const normalizeFieldKey = (key: string): string => {
  return key.toLowerCase().replace(/[-_\s]/g, '');
};

export interface SectionConfig {
  sectionKey: string;
  sectionAliases: string[];
  fields: string[];
}

export const SECTION_CONFIGS: Record<string, SectionConfig> = {
  personal: {
    sectionKey: 'personal',
    sectionAliases: [
      'personal',
      'personaldetails',
      'applicantdetails',
      'aadharentry',
      'aadharverify',
      'aadhaarentry',
      'aadhaarverify',
    ],
    fields: [
      'name',
      'dob',
      'gender',
      'category',
      'email',
      'phone',
      'aadhaarno',
      'photo',
    ],
  },
  address: {
    sectionKey: 'address',
    sectionAliases: ['address', 'addressdetails', 'location'],
    fields: ['district', 'panchayat', 'locality'],
  },
  shg: {
    sectionKey: 'shg',
    sectionAliases: [
      'loanshg',
      'shg',
      'shgdetails',
      'bankdetails',
      'bankpassbook',
    ],
    fields: ['shgname', 'shgid', 'dateofformation', 'certificate', 'bankcopy'],
  },
  income: {
    sectionKey: 'income',
    sectionAliases: [
      'familyincome',
      'income',
      'incomedetails',
      'annualincome',
      'familyincomerange',
    ],
    fields: ['familyincome'],
  },
  activity: {
    sectionKey: 'activity',
    sectionAliases: [
      'economyactivity',
      'economicactivity',
      'activity',
      'loandetails',
      'economicactivitydetails',
      'proposedactivity',
    ],
    fields: ['economicactivity', 'descriptionofproposedactivity'],
  },
  document: {
    sectionKey: 'document',
    sectionAliases: [
      'document',
      'documents',
      'documentlist',
      'uploadeddocuments',
      'bankdetails',
    ],
    fields: ['photo', 'certificate', 'bankcopy'],
  },
  review: {
    sectionKey: 'review',
    sectionAliases: [
      'review',
      'declaration',
      'acknowledgement',
      'acknowledgment',
    ],
    fields: ['declearedname', 'declearedguardianname'],
  },
  acknowledgement: {
    sectionKey: 'acknowledgement',
    sectionAliases: [
      'acknowledgement',
      'acknowledgment',
      'review',
      'declaration',
    ],
    fields: ['declearedname', 'declearedguardianname'],
  },
};

const FIELD_ALIASES: Record<string, string[]> = {
  // Personal Info
  name: ['name', 'fullname', 'applicantname', 'username'],
  dob: ['dob', 'dateofbirth', 'birthdate'],
  gender: ['gender', 'sex'],
  category: ['category', 'caste'],
  email: ['email', 'emailaddress'],
  phone: ['phone', 'mobile', 'mobilenumber', 'phonenumber', 'aadharverify'],
  aadhaarno: [
    'aadhaarno',
    'aadhaar',
    'aadhaarnumber',
    'aadharentry',
    'aadharverify',
    'aadhaarentry',
    'aadhaarverify',
  ],
  photo: ['photo', 'photograph', 'applicantphoto', 'image', 'document'],

  // SHG Details
  shgname: ['shgname', 'nameofshg'],
  shgid: ['shgid', 'shgidnumber', 'shgnumber'],
  dateofformation: ['dateofformation', 'formationdate', 'shgdate'],
  certificate: [
    'certificate',
    'shgcertificate',
    'certificateurl',
    'proof',
    'document',
  ],
  bankcopy: [
    'bankcopy',
    'bankpassbook',
    'passbook',
    'bankstatement',
    'bankdetails',
    'document',
  ],

  // Address Details
  district: ['district', 'districtid', 'districtname'],
  panchayat: [
    'panchayat',
    'grampanchayat',
    'block',
    'municipality',
    'panchayatid',
  ],
  locality: [
    'locality',
    'localityvillageward',
    'village',
    'ward',
    'address',
    'addressline',
  ],

  // Income Details
  familyincome: [
    'familyincome',
    'income',
    'annualincome',
    'monthlyincome',
    'familyincomerange',
  ],

  // Economic Activity
  economicactivity: [
    'economicactivity',
    'economyactivity',
    'activity',
    'occupation',
    'loandetails',
  ],
  descriptionofproposedactivity: [
    'descriptionofproposedactivity',
    'description',
    'proposedactivity',
    'activitydescription',
  ],

  // Review / Declaration
  declearedname: ['declearedname', 'declaredname'],
  declearedguardianname: [
    'declearedguardianname',
    'declaredguardianname',
    'guardianname',
    'guardian',
  ],
};

/**
 * Checks whether a specific field is allowed to be edited.
 * If explicit fieldList is provided, checks if field or its parent section is in fieldList.
 * If fieldList is not provided, allows editing for in-progress applications and blocks submitted/rejected.
 */
export const isFieldEditable = (
  fieldName: string,
  fieldList?: any,
  loanStatus?: string | null,
): boolean => {
  const parsedFields = parseFieldList(fieldList);
  const status = (loanStatus || '').toLowerCase().trim();
  const isRejected = status === 'rejected' || status === 'reject';
  const isSubmitted =
    status === 'submitted' ||
    status === 'under_review' ||
    status === 'approved' ||
    isRejected;

  // 1. If explicit fieldList is provided (non-empty)
  if (parsedFields.length > 0) {
    const normalizedTarget = normalizeFieldKey(fieldName);
    const aliases = FIELD_ALIASES[normalizedTarget] || [normalizedTarget];

    // Find if target field belongs to any section config
    const parentSectionConfigs = Object.values(SECTION_CONFIGS).filter(
      cfg =>
        cfg.fields.includes(normalizedTarget) ||
        cfg.fields.some(f => aliases.includes(f)),
    );

    // Collect all section aliases that grant permission to this field
    const parentSectionAliases = parentSectionConfigs.flatMap(
      cfg => cfg.sectionAliases,
    );

    const allowedTokens = [...aliases, ...parentSectionAliases];

    return parsedFields.some(f => {
      const norm = normalizeFieldKey(f);
      return allowedTokens.some(
        token => norm === token || norm.includes(token) || token.includes(norm),
      );
    });
  }

  // 2. If no fieldList provided
  if (isRejected || isSubmitted) {
    return false;
  }

  return true;
};

/**
 * Checks whether ANY field in a section is editable, or if the section key itself is in fieldList.
 * Only returns true if a matching key is explicitly present in fieldList.
 * If fieldList is null, undefined, empty, or does not contain a matching key, returns false.
 */
export const isSectionEditable = (
  section:
    | 'personal'
    | 'address'
    | 'shg'
    | 'income'
    | 'activity'
    | 'document'
    | 'review'
    | 'acknowledgement'
    | string,
  fieldList?: any,
  loanStatus?: string | null,
): boolean => {
  const parsedFields = parseFieldList(fieldList);

  // If fieldList is null, undefined, or empty: do NOT show edit button
  if (!parsedFields || parsedFields.length === 0) {
    return false;
  }

  const normalizedSection = normalizeFieldKey(section);
  const config =
    SECTION_CONFIGS[normalizedSection] ||
    Object.values(SECTION_CONFIGS).find(c =>
      c.sectionAliases.includes(normalizedSection),
    );

  if (config) {
    const tokensToCheck = [
      ...config.sectionAliases,
      ...config.fields.flatMap(f => FIELD_ALIASES[f] || [f]),
    ];

    return parsedFields.some(f => {
      const norm = normalizeFieldKey(f);
      return tokensToCheck.some(
        token =>
          norm === token || norm.includes(token) || token.includes(norm),
      );
    });
  }

  // Direct match fallback
  return parsedFields.some(f => {
    const norm = normalizeFieldKey(f);
    return (
      norm === normalizedSection ||
      norm.includes(normalizedSection) ||
      normalizedSection.includes(norm)
    );
  });
};
