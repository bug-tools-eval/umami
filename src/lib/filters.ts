export const percentFilter = (data: any[]) => {
  if (!Array.isArray(data)) return [];
  const total = data.reduce((n, { y }) => n + y, 0);
  return data.map(({ x, y, ...props }) => ({ x, y, z: total ? (y / total) * 100 : 0, ...props }));
};

export const paramFilter = (data: any[]) => {
  const map = data.reduce((obj, { x, y }) => {
    try {
      const searchParams = new URLSearchParams(x);

      for (const [key, value] of searchParams) {
        if (!obj[key]) {
          obj[key] = { [value]: y };
        } else if (!obj[key][value]) {
          obj[key][value] = y;
        } else {
          obj[key][value] += y;
        }
      }
    } catch {
      // Ignore
    }

    return obj;
  }, {});

  const result: { x: string; p: string; v: string; y: any }[] = [];

  for (const key of Object.keys(map)) {
    for (const n of Object.keys(map[key])) {
      result.push({ x: `${key}=${n}`, p: key, v: n, y: map[key][n] });
    }
  }

  return result;
};
