export type GiftPower = 'ROSE_STRIKE' | 'DONUT_BOOST';
// Exact names only. Add regional IDs after observing the actual LIVE payload.
const powers: Record<string, GiftPower> = {
  rose: 'ROSE_STRIKE', rosa: 'ROSE_STRIKE',
  doughnut: 'DONUT_BOOST', donut: 'DONUT_BOOST',
  rosquinha: 'DONUT_BOOST', rosquina: 'DONUT_BOOST',
};
export function giftPowerFor(name: string): GiftPower | undefined {
  return powers[name.trim().toLowerCase()];
}
