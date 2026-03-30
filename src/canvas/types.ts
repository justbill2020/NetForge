export interface OpportunityTerms {
  termYears: number
  licenseTier: string
}

export type LinkType = 'wan' | 'lan' | 'wireless' | 'uplink'

export interface Site {
  id: string
  name: string
}

export interface PlacedDevice {
  id: string
  productSku: string
  x: number
  y: number
  siteId?: string
  label?: string
}

export interface DesignLink {
  id: string
  fromDeviceId: string
  toDeviceId: string
  linkType: LinkType
}

export interface DesignDoc {
  version: 1
  devices: PlacedDevice[]
  links: DesignLink[]
  sites: Site[]
  defaultOpportunityTerms: OpportunityTerms
}

export function emptyDesignDoc(): DesignDoc {
  return {
    version: 1,
    devices: [],
    links: [],
    sites: [],
    defaultOpportunityTerms: { termYears: 3, licenseTier: 'ENT' },
  }
}
