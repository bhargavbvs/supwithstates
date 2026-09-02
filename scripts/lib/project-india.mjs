import { projectGeo } from './project-geo.mjs';

/** The national map, projected the same way a state's is.
 *
 *  projectGeo speaks in assembly seats and districts, which are the only
 *  units the state maps have. The national map's unit is a parliamentary
 *  seat inside a state outline, so the features are handed over under the
 *  names projectGeo knows and their own are put back afterwards. Shared by
 *  the build and by the script that decides how much to simplify, so the
 *  size that is measured is the size that ships. */
export function projectIndia(pcFc, outlinesFc) {
  const projected = projectGeo(
    {
      type: 'FeatureCollection',
      features: pcFc.features.map((f) => ({
        ...f,
        properties: { AC_NO: f.properties.id, AC_NAME: f.properties.pc_name, district: f.properties.state },
      })),
    },
    {
      type: 'FeatureCollection',
      features: outlinesFc.features.map((f) => ({
        ...f, properties: { DISTRICT: f.properties.state },
      })),
    },
  );
  const byId = new Map(pcFc.features.map((f) => [f.properties.id, f.properties]));
  return {
    viewBox: projected.viewBox,
    projection: projected.projection,
    constituencies: projected.constituencies.map((c) => {
      const p = byId.get(c.ac_no);
      return {
        ac_no: c.ac_no, name: p.pc_name, state: p.state, state_name: p.state_name,
        pc_no: p.pc_no, d: c.d,
      };
    }),
    districts: projected.districts,
  };
}
