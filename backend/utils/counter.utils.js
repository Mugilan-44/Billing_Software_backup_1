import Counter from '../models/Counter.model.js';
import CompanySettings from '../models/CompanySettings.js';

export async function getNextSequenceValue(sequenceName, prefix, companyId) {
  const query = companyId ? { id: `${sequenceName}_${companyId}` } : { id: sequenceName };
  const counter = await Counter.findOneAndUpdate(
    query,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(6, '0')}`;
}

export async function getNextCustomSequence(companyId, type, taxMode) {
  let settings = await CompanySettings.findOne({ companyId });
  if (!settings) {
    const defaultPrefix = type === 'invoice' ? 'INV' : type === 'challan' ? 'CHL' : type.slice(0, 3).toUpperCase();
    const modeSuffix = taxMode === 'WITHOUT_TAX' ? 'NT' : 'WT';
    return `${defaultPrefix}-${modeSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const modeKey = taxMode === 'WITHOUT_TAX' ? 'withoutTax' : 'withTax';
  
  if (!settings.numberingSettings || !settings.numberingSettings[type] || !settings.numberingSettings[type][modeKey]) {
    // If not set up, configure dynamically and save
    settings.numberingSettings = settings.numberingSettings || {};
    const defaultPref = type === 'invoice' ? 'INV' : type === 'challan' ? 'CHL' : type.slice(0, 3).toUpperCase();
    settings.numberingSettings[type] = {
      withTax: { auto: true, prefix: `${defaultPref}-WT-`, nextNumber: 1, digits: 4 },
      withoutTax: { auto: true, prefix: `${defaultPref}-NT-`, nextNumber: 1, digits: 4 }
    };
    await settings.save();
  }

  const config = settings.numberingSettings[type][modeKey];
  const updateKey = `numberingSettings.${type}.${modeKey}.nextNumber`;
  
  const updatedSettings = await CompanySettings.findOneAndUpdate(
    { companyId },
    { $inc: { [updateKey]: 1 } },
    { new: false }
  );

  const currentNum = updatedSettings.numberingSettings[type][modeKey].nextNumber;
  const prefix = config.prefix || '';
  const digits = config.digits || 4;

  return `${prefix}${String(currentNum).padStart(digits, '0')}`;
}
