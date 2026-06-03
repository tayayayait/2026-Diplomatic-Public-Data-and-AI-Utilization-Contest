import { describe, it, expect, beforeEach } from 'vitest';
import { useItineraryStore } from './itineraryStore';

describe('useItineraryStore', () => {
  beforeEach(() => {
    // ?ㅽ넗??珥덇린??    useItineraryStore.setState({
      tripStartDate: null,
      tripEndDate: null,
      durationDays: 0,
      globalPlaces: [],
      days: {},
    });
  });

  it('initializeTrip???④린/?κ린 ?쇱옄瑜??щ컮瑜닿쾶 ?ㅼ젙?섎뒗吏 ?뺤씤', () => {
    const store = useItineraryStore.getState();
    store.initializeTrip('2026-06-01', '2026-06-03');
    
    const state = useItineraryStore.getState();
    expect(state.durationDays).toBe(3);
    expect(Object.keys(state.days).length).toBe(3);
    expect(state.days[1].isGenerated).toBe(false); // 珥덇린???쒖뿏 ?앹꽦?섏? ?딆쓬
  });

  it('injectAccommodationReturn???ｌ? 耳?댁뒪(以묐났) ?놁씠 ?쒗뵆由우쓣 ??二쇱엯?섎뒗吏 ?뺤씤', () => {
    useItineraryStore.getState().initializeTrip('2026-06-01', '2026-06-02');
    useItineraryStore.getState().generateDay(1, []); // Day 1 ?쒖꽦??    
    // 二쇱엯 1??    useItineraryStore.getState().injectAccommodationReturn(1);
    let day1 = useItineraryStore.getState().days[1];
    expect(day1.slots.length).toBe(1);
    expect(day1.slots[0].slotType).toBe('accommodation_return');

    // 二쇱엯 2??(以묐났 諛⑹뼱 濡쒖쭅 ?뺤씤)
    useItineraryStore.getState().injectAccommodationReturn(1);
    day1 = useItineraryStore.getState().days[1];
    expect(day1.slots.length).toBe(1); // ?ъ쟾??1媛쒖뿬????  });

  it('removeSlot???꾩닔 ?쇱젙??吏?곗? 紐삵븯?꾨줉 諛⑹뼱?섎뒗吏 ?뺤씤', () => {
    useItineraryStore.getState().initializeTrip('2026-06-01', '2026-06-02');
    useItineraryStore.getState().generateDay(1, [
      { id: 's1', placeId: 'p1', slotType: 'mandatory' },
      { id: 's2', placeId: 'p2', slotType: 'optional' },
      { id: 's3', placeId: null, slotType: 'accommodation_return' }
    ]);

    // ?듭뀛???щ’ 吏?곌린 ?쒕룄 (?깃났?댁빞 ??
    useItineraryStore.getState().removeSlot(1, 's2');
    let day1 = useItineraryStore.getState().days[1];
    expect(day1.slots.length).toBe(2);

    // ?꾩닔 紐낆냼 吏?곌린 ?쒕룄 (?ㅽ뙣?댁빞 ??
    useItineraryStore.getState().removeSlot(1, 's1');
    day1 = useItineraryStore.getState().days[1];
    expect(day1.slots.length).toBe(2);

    // ?숈냼 蹂듦? 吏?곌린 ?쒕룄 (?ㅽ뙣?댁빞 ??
    useItineraryStore.getState().removeSlot(1, 's3');
    day1 = useItineraryStore.getState().days[1];
    expect(day1.slots.length).toBe(2);
  });

  it('addPlaceToDay媛 蹂닿????μ냼瑜??뱀젙 ?좎쭨 ??꾨씪?몄뿉 ??踰덈쭔 異붽??쒕떎', () => {
    const place = {
      id: 'p1',
      name: 'Ohori Park',
      type: 'attraction' as const,
    };

    useItineraryStore.getState().initializeTrip('2026-06-01', '2026-06-02');
    useItineraryStore.getState().generateDay(1, []);
    useItineraryStore.getState().addPlaceToDay(1, place);
    useItineraryStore.getState().addPlaceToDay(1, place);

    const state = useItineraryStore.getState();
    expect(state.globalPlaces).toEqual([place]);
    expect(state.days[1].slots).toEqual([
      expect.objectContaining({
        id: 'day-1-place-p1',
        place,
        placeId: 'p1',
        slotType: 'optional',
      }),
    ]);
  });
});
