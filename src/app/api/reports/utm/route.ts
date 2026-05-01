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

  const [parameters, filters] = await Promise.all([
    setWebsiteDate(websiteId, body.parameters),
    getQueryFilters(body.filters, websiteId),
  ]);

  const data = {
    utm_source: [],
    utm_medium: [],
    utm_campaign: [],
    utm_term: [],
    utm_content: [],
  };
  const results = await Promise.all(
    UTM_PARAMS.map(key =>
      getUTM(websiteId, { column: key, ...parameters } as UTMParameters, filters),
    ),
  );

  UTM_PARAMS.forEach((key, index) => {
    data[key] = results[index];
  });

  return json(data);
}
