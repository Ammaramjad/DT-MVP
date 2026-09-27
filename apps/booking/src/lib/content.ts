/** Journey stage positions along the route as t in [0,1]. */
export const JOURNEY_STAGES = [
  { t: 0.0, key: 'book', title: 'Book', copy: 'Your request enters the network the instant you confirm.', line: 'Journey requested' },
  { t: 0.2, key: 'match', title: 'Match', copy: 'The closest professional driver is matched in seconds.', line: 'Your driver is ready' },
  { t: 0.4, key: 'arrive', title: 'Driver arrives', copy: 'Your vehicle glides to the pickup point, exactly on time.', line: 'Meet at the curb' },
  { t: 0.62, key: 'travel', title: 'Travel', copy: 'Follow the route in real time. Quiet cabin, steady hands.', line: 'Track your journey' },
  { t: 0.9, key: 'destination', title: 'Destination', copy: 'You arrive relaxed. Receipt sent. Nothing else to do.', line: 'Arrive in comfort' },
]

export const WHY_ITEMS = [
  { key: 'always', title: '24/7 Service', copy: 'Every hour, every day. The network never sleeps.' },
  { key: 'drivers', title: 'Professional Drivers', copy: 'Vetted, trained, and rated by every passenger.' },
  { key: 'tracking', title: 'Real-Time Tracking', copy: 'Watch your vehicle approach, metre by metre.' },
  { key: 'pricing', title: 'Transparent Pricing', copy: 'The fare you see is the fare you pay.' },
  { key: 'safety', title: 'Safe Transportation', copy: 'Insured journeys, monitored end to end.' },
  { key: 'instant', title: 'Instant Booking', copy: 'From request to confirmation in seconds.' },
]

export const SHOWCASE = [
  { key: 'comfort', title: 'Comfort', copy: 'Ventilated leather, whisper-quiet cabin, climate tuned before you step in.', color: '#f4e9c8' },
  { key: 'space', title: 'Space', copy: 'Executive rear legroom and luggage capacity for the longest itinerary.', color: '#dfe6ff' },
  { key: 'safety', title: 'Safety', copy: 'Five-star rated platforms, driver assistance, continuous monitoring.', color: '#a7b6ff' },
  { key: 'tech', title: 'Technology', copy: 'Live route sharing, in-car connectivity, contactless everything.', color: '#c7f0ff' },
  { key: 'service', title: 'Professional Service', copy: 'Chauffeurs trained in discretion, punctuality and care.', color: '#ffe3c2' },
]
