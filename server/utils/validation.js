function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function isValidDate(dateString) {
  return !!dateString && !Number.isNaN(new Date(dateString).getTime());
}

function isValidTime(timeString) {
  if (!timeString) return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(timeString));
}

function toMinutes(startTime, endTime) {
  const start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);
  return Math.max(0, (end - start) / 60000);
}

module.exports = {
  isValidEmail,
  isValidDate,
  isValidTime,
  toMinutes,
};
