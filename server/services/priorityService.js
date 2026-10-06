function normalizeScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function calculateDeadlineScore(deadlineDate) {
  if (!deadlineDate) return 10;

  const today = new Date();
  const deadline = new Date(deadlineDate);
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return 30;
  if (diffDays <= 3) return 24;
  if (diffDays <= 7) return 18;
  if (diffDays <= 14) return 12;
  return 6;
}

function calculatePriorityScore({ urgencyLevel = 'Medium', requestedPriority = 'Medium', resourceStatus = 'Available', strategicFlags = [], deadlineDate, departmentMatch = false }) {
  const urgencyWeights = { Low: 12, Medium: 20, High: 32, Critical: 40 };
  const requestedWeights = { Low: 8, Medium: 12, High: 18, Critical: 24 };

  const urgencyScore = urgencyWeights[urgencyLevel] || 20;
  const requestedScore = requestedWeights[requestedPriority] || 12;
  const deadlineScore = calculateDeadlineScore(deadlineDate);
  const strategicScore = Math.min(20, Math.max(0, strategicFlags.length * 6));
  const departmentScore = departmentMatch ? 12 : 6;
  const availabilityScore = resourceStatus === 'Available' ? 18 : resourceStatus === 'Partially Available' ? 12 : 5;

  const total = urgencyScore + requestedScore + deadlineScore + strategicScore + departmentScore + availabilityScore;
  return normalizeScore(total);
}

function buildPriorityExplanation({ score, urgencyLevel, requestedPriority, deadlineDate, resourceStatus, departmentMatch, strategicFlags }) {
  const reasons = [];
  reasons.push(`Priority score is ${score}/100.`);
  reasons.push(`Urgency is ${urgencyLevel.toLowerCase()}, which adds significant weight.`);
  reasons.push(`Requested priority is ${requestedPriority.toLowerCase()}, reinforcing urgency.`);

  if (departmentMatch) {
    reasons.push('The request aligns with a strategic department priority.');
  }

  if (strategicFlags.length) {
    reasons.push(`Strategic focus includes: ${strategicFlags.join(', ')}.`);
  }

  if (deadlineDate) {
    const diff = Math.ceil((new Date(deadlineDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff <= 3) {
      reasons.push('Deadline is approaching, which increases urgency.');
    }
  }

  if (resourceStatus === 'Available') {
    reasons.push('The requested resource is available during the requested time window.');
  } else {
    reasons.push(`The resource status is ${resourceStatus.toLowerCase()}, so it needs review.`);
  }

  return reasons.join(' ');
}

module.exports = {
  calculatePriorityScore,
  buildPriorityExplanation,
  calculateDeadlineScore,
};
