const locale_ja = {
  directions: {
    N: '北',
    NE: '北東',
    E: '西',
    SE: '南東',
    S: '南',
    SW: '南西',
    W: '西',
    NW: '北西',
    SlightRight: 'やや右',
    Right: '右',
    SharpRight: '鋭角に右',
    SlightLeft: 'やや左',
    Left: '左',
    SharpLeft: '鋭角に左',
    Uturn: '振り返る'
  },
  instructions: {
    // instruction, postfix if the road is named
    'Head':
      ['{dir}に向く', ' {road}沿い'],
    'Continue':
      ['{dir}に進む'],
    'TurnAround':
      ['振り返る'],
    'WaypointReached':
      ['中継地点に到着'],
    'Roundabout':
      ['Take the {exitStr} exit in the roundabout', ' onto {road}'],
    'DestinationReached':
      ['目的地に到着'],
    'Fork': ['分岐で turn {modifier}', ' onto {road}'],
    'Merge': ['Merge {modifier}', ' onto {road}'],
    'OnRamp': ['Turn {modifier} on the ramp', ' onto {road}'],
    'OffRamp': ['Take the ramp on the {modifier}', ' onto {road}'],
    'EndOfRoad': ['Turn {modifier} at the end of the road', ' onto {road}'],
    'Onto': '{road}沿い'
  },
  formatOrder: function(n) {
    var i = n % 10 - 1,
    suffix = ['st', 'nd', 'rd'];

    return suffix[i] ? n + suffix[i] : n + 'th';
  },
  ui: {
    startPlaceholder: '出発',
    viaPlaceholder: '{viaNumber}経由',
    endPlaceholder: '到着'
  },
  units: {
    meters: 'm',
    kilometers: 'km',
    yards: 'yd',
    miles: 'mi',
    hours: 'h',
    minutes: 'min',
    seconds: 's'
  }
};
export default { locale_ja };