import { PLACES, SERVICES, VEHICLES, fmtTWD, vehicleFits, type VehicleId } from '../../lib/data'
import { SERVICE_NAMES, type Copy } from '../../lib/experienceCopy'
import { VEHICLE_ASSETS, incompatibilityReason } from '../../vehicles/vehicleRegistry'
import { useStore, useTrip } from '../../store'
import type { BookingStep } from './bookingSteps'

export function BookingControls({ copy, step, onStep }: { copy: Copy; step: BookingStep; onStep: (step: BookingStep) => void }) {
  const booking = useStore(state => state.booking)
  const setBooking = useStore(state => state.setBooking)
  const locale = useStore(state => state.locale)
  const trip = useTrip()
  const titles = [copy.selectService, copy.pickup, copy.destination, copy.schedule, copy.travellers, 'Vehicle class', 'Vehicle model', locale === 'en' ? 'Journey options' : '行程選項', copy.review]
  const valid = step === 0 ? !!booking.service : step === 1 ? !!booking.pickup : step === 2 ? !!booking.destination : step === 3 ? !!booking.date && !!booking.time : step === 5 || step === 6 ? vehicleFits(trip.spec, booking.passengers, booking.luggage) : true

  return <section className="booking-controls" aria-labelledby="control-title">
    <header><span>{String(step + 1).padStart(2,'0')} / 09</span><h3 id="control-title">{titles[step]}</h3></header>
    <div className="control-body">
      {step === 0 && <div className="choice-list">{SERVICES.map(service => { const name = SERVICE_NAMES[service.id]; return <button type="button" aria-pressed={booking.service === service.id} key={service.id} onClick={() => setBooking({ service: service.id })}><i/><span><b>{locale === 'en' ? name.en : name.zh}</b><small>{locale === 'en' ? name.detailEn : name.detailZh}</small></span><em>↗</em></button> })}</div>}
      {(step === 1 || step === 2) && <div className="place-grid">{PLACES.map(place => <button type="button" aria-pressed={(step === 1 ? booking.pickup : booking.destination)?.id === place.id} key={place.id} onClick={() => setBooking(step === 1 ? { pickup: place } : { destination: place })}><span>{place.type}</span><b>{place.name}</b><small>{place.city} · {place.area}</small></button>)}</div>}
      {step === 3 && <div className="schedule-fields"><label><span>{copy.date}</span><input required type="date" min={new Date().toISOString().slice(0,10)} value={booking.date} onChange={event => setBooking({ date: event.target.value })}/></label><label><span>{copy.time}</span><input required type="time" value={booking.time} onChange={event => setBooking({ time: event.target.value })}/></label></div>}
      {step === 4 && <div className="counter-list">{([['passengers', copy.passengers, 1, 8], ['luggage', copy.luggage, 0, 8]] as const).map(([key,label,min,max]) => <div key={key}><span><b>{label}</b><small>{key === 'passengers' ? 'Every rider needs a seat' : 'Standard checked-size bags'}</small></span><button aria-label={`Fewer ${key}`} disabled={booking[key] <= min} onClick={() => setBooking({ [key]: Math.max(min, booking[key] - 1) })}>−</button><strong>{booking[key]}</strong><button aria-label={`More ${key}`} disabled={booking[key] >= max} onClick={() => setBooking({ [key]: Math.min(max, booking[key] + 1) })}>+</button></div>)}</div>}
      {(step === 5 || step === 6) && <div className="vehicle-grid">{VEHICLES.map(vehicle => { const asset = VEHICLE_ASSETS[vehicle.id]; const reason = incompatibilityReason(asset, booking.passengers, booking.luggage); return <button type="button" key={vehicle.id} disabled={!!reason} aria-pressed={booking.vehicleModelId === vehicle.id} onClick={() => setBooking({ vehicleModelId: vehicle.id as VehicleId })}><span><small>{asset.classId.replace('-', ' ')}</small><b>{step === 5 ? vehicle.name : asset.displayName}</b></span><span><em>{asset.passengers} seats · {asset.luggage} bags</em><strong>{reason ?? fmtTWD(trip.fareFor(vehicle.id))}</strong></span></button> })}</div>}
      {step === 7 && <div className="option-list">{copy.optionItems.map((label,index) => { const id = ['greet','quiet','child'][index]; return <label key={id}><input type="checkbox" checked={booking.options.includes(id)} onChange={() => setBooking({ options: booking.options.includes(id) ? booking.options.filter(option => option !== id) : [...booking.options,id] })}/><span><b>{label}</b><small>{index === 0 ? 'Driver greeting context at eligible pickups' : index === 1 ? 'A low-interruption service preference' : 'Subject to vehicle availability'}</small></span></label> })}</div>}
      {step === 8 && <div className="review-grid"><div><span>Journey</span><b>{booking.pickup?.name}</b><i>→</i><b>{booking.destination?.name}</b></div><div><span>When</span><b>{booking.date} · {booking.time}</b></div><div><span>Vehicle</span><b>{VEHICLE_ASSETS[booking.vehicleModelId].displayName}</b><small>{booking.passengers} passengers · {booking.luggage} bags</small></div><div className="review-total"><span>Estimated fare</span><b>{fmtTWD(trip.fare)}</b><small>{trip.km.toFixed(0)} km · approximately {trip.duration} min</small></div><p>{copy.disclaimer}</p></div>}
    </div>
    <footer>{step > 0 ? <button className="control-back" onClick={() => onStep((step - 1) as BookingStep)}>← {copy.back}</button> : <span/>}<button className="control-next" disabled={!valid} onClick={() => step === 8 ? useStore.getState().confirm() : onStep((step + 1) as BookingStep)}>{step === 8 ? copy.request : copy.next}<span>→</span></button></footer>
  </section>
}
