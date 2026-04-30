import { UTM_PARAMS } from '@/lib/constants';
import { getQueryFilters, parseRequest, setWebsiteDate } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { reportResultSchema } from '@/lib/schema';
import { canViewWebsite } from '@/permissions';
import { getUTM, type UTMParameters } from '@/queries/sql';

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, reportResultSchema);

  if (error) {
    return error();
  }

  const { websiteId } = body;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const [filters, parameters] = await Promise.all([
    getQueryFilters(body.filters, websiteId),
    setWebsiteDate(websiteId, body.parameters),
  ]);

  const results = await Promise.all(
    UTM_PARAMS.map(key =>
      getUTM(websiteId, { column: key, ...parameters } as UTMParameters, filters),
    ),
  );

  const data = UTM_PARAMS.reduce(
    (acc, key, i) => {
      acc[key] = results[i];
      return acc;
    },
    {} as Record<(typeof UTM_PARAMS)[number], any>,
  );

  return json(data);
}
