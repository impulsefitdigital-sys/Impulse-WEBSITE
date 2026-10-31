import { landingPageInfo, type LandingPageId } from "@/lib/requests";

/** Pastille « LP1 » / « LP2 » : landing page par laquelle le visiteur est arrivé. */
const LandingPageBadge = ({ id, long = false }: { id: LandingPageId; long?: boolean }) => {
  const lp = landingPageInfo(id);
  return (
    <span title={`Arrivé par ${lp.label} (${lp.path})`} className={`inline-flex flex-none items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${lp.className}`}>
      {long ? lp.label : lp.value}
    </span>
  );
};

export default LandingPageBadge;
