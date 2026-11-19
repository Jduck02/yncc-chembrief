export function getKstDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getOffsetKstDateString(daysOffset: number): string {
  const now = new Date();
  const target = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  return getKstDateString(target);
}

export function formatKstDateTime(date: Date = new Date()): string {
  const datePart = getKstDateString(date);
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${datePart} ${timeFormatter.format(date)} KST`;
}

export function getNext0900KstDate(now: Date = new Date()): Date {
  // Convert current UTC time to KST shifted milliseconds
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffsetMs);
  const targetKst = new Date(
    Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate(),
      9,
      0,
      0,
      0
    )
  );
  if (kstNow.getTime() >= targetKst.getTime()) {
    targetKst.setUTCDate(targetKst.getUTCDate() + 1);
  }
  return new Date(targetKst.getTime() - kstOffsetMs);
}
