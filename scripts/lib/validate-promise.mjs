export function validatePromise(rec) {
  const errors = [];

  if (!rec.id) errors.push('missing id');
  if (!rec.promise_set) errors.push('missing promise_set');
  if (!Array.isArray(rec.parties) || rec.parties.length === 0) errors.push('missing or empty parties array');
  if (!rec.headline) errors.push('missing headline');
  
  if (!rec.original_text) errors.push('missing original_text');
  if (!rec.original_source?.url) errors.push('missing original_source.url');
  
  const validStatuses = ['not_started', 'announced', 'in_progress', 'delivered', 'diluted', 'stalled'];
  if (!validStatuses.includes(rec.status)) errors.push(`invalid status: ${rec.status}. Must be one of: ${validStatuses.join(', ')}`);
  
  if (!rec.status_since) errors.push('missing status_since');
  else if (new Date(rec.status_since) > new Date()) errors.push(`status_since ${rec.status_since} is in the future`);

  if (!rec.status_reason) errors.push('missing status_reason');

  if (!Array.isArray(rec.evidence) || rec.evidence.length === 0) {
    errors.push('must have at least one evidence item');
  } else {
    for (const [i, ev] of rec.evidence.entries()) {
      if (!ev.date) errors.push(`evidence[${i}] missing date`);
      if (!ev.type) errors.push(`evidence[${i}] missing type`);
      if (!ev.label) errors.push(`evidence[${i}] missing label`);
      if (!ev.url) errors.push(`evidence[${i}] missing url`);
    }
    
    if (['delivered', 'diluted', 'stalled', 'in_progress'].includes(rec.status)) {
      const hasRecentEvidence = rec.evidence.some(ev => ev.date >= rec.status_since);
      if (!hasRecentEvidence) {
        errors.push(`status '${rec.status}' since ${rec.status_since} requires evidence dated on or after that date`);
      }
    }
  }

  // Warning for stale non-terminal statuses
  if (['not_started', 'announced', 'in_progress'].includes(rec.status)) {
    const daysSince = (new Date() - new Date(rec.status_since)) / (1000 * 60 * 60 * 24);
    if (daysSince > 90) {
      console.warn(`\x1b[33mWarning\x1b[0m: Promise '${rec.id}' has been ${rec.status} since ${rec.status_since} (>90 days)`);
    }
  }

  return errors;
}

export function validatePromiseSet(rec) {
  const errors = [];
  if (!rec.id) errors.push('missing id');
  if (!rec.title) errors.push('missing title');
  if (!Array.isArray(rec.parties) || rec.parties.length === 0) errors.push('missing or empty parties array');
  if (!rec.election) errors.push('missing election');
  return errors;
}
