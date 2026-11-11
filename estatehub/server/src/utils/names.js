// How a person's name is shown to OTHER users.
// Clients appear as "First L." (privacy). Brokers and admins use their full name,
// because a broker's name is their public business identity.
function publicName(fullName = '', role = 'client') {
  const clean = String(fullName).trim();
  if (role !== 'client') return clean;
  const parts = clean.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'User';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

module.exports = { publicName };
