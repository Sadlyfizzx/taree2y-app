const STATION_DIRECTORY = {
  "القاهرة": {
    primary: 'محطة القاهرة الرئيسية',
    secondary: 'محطة الجيزة',
  },
  "الجيزة": {
    primary: 'محطة الجيزة',
    secondary: 'محطة المنيب',
  },
  "الإسكندرية": {
    primary: 'محطة الإسكندرية الرئيسية',
    secondary: 'محطة سيدي جابر',
  },
  "المنصورة": {
    primary: 'محطة المنصورة الرئيسية',
    secondary: 'محطة طلخا',
  },
  "أسوان": {
    primary: 'محطة أسوان الرئيسية',
    secondary: 'محطة كوم أمبو',
  },
  "الأقصر": {
    primary: 'محطة الأقصر الرئيسية',
    secondary: 'محطة أرمنت',
  },
  "دمياط": {
    primary: 'محطة دمياط الرئيسية',
    secondary: 'محطة رأس البر',
  },
  "بورسعيد": {
    primary: 'محطة بورسعيد الرئيسية',
    secondary: 'محطة شرق بورسعيد',
  },
  "الإسماعيلية": {
    primary: 'محطة الإسماعيلية الرئيسية',
    secondary: 'محطة المستقبل',
  },
  "السويس": {
    primary: 'محطة السويس الرئيسية',
    secondary: 'محطة العين السخنة',
  },
  "مرسى مطروح": {
    primary: 'محطة مرسى مطروح الرئيسية',
    secondary: 'محطة روميل',
  },
  "شرم الشيخ": {
    primary: 'محطة شرم الشيخ الرئيسية',
    secondary: 'محطة خليج نعمة',
  },
  "الغردقة": {
    primary: 'محطة الغردقة الرئيسية',
    secondary: 'محطة سهل حشيش',
  },
  "دهب": {
    primary: 'محطة دهب الرئيسية',
    secondary: 'محطة اللاجون',
  },
  "طابا": {
    primary: 'محطة طابا الرئيسية',
    secondary: 'محطة نويبع',
  },
  "سوهاج": {
    primary: 'محطة سوهاج الرئيسية',
    secondary: 'محطة أخميم',
  },
  "قنا": {
    primary: 'محطة قنا الرئيسية',
    secondary: 'محطة نجع حمادي',
  },
};

const buildFallbackStation = (city) => {
  if (!city) return 'المحطة الرئيسية';
  return city.startsWith('محطة') ? city : `محطة ${city} الرئيسية`;
};

export function getPrimaryStationName(city) {
  return STATION_DIRECTORY[city]?.primary || buildFallbackStation(city);
}

export function getSecondaryStationName(city) {
  return STATION_DIRECTORY[city]?.secondary || getPrimaryStationName(city);
}

export function withStationNames(trip) {
  if (!trip) return trip;

  return {
    ...trip,
    fromStationName: trip.fromStationName || getPrimaryStationName(trip.from),
    toStationName: trip.toStationName || getPrimaryStationName(trip.to),
  };
}
