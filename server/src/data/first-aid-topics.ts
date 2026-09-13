export interface FirstAidTopic {
  id: string;
  title: string;
  keywords: string[];
  steps: string[];
}

const STANDARD_DISCLAIMER =
  'This is basic first-aid guidance only, not medical advice. Keep the person as safe and comfortable as possible — officials will take over care as soon as they arrive.';

export const FIRST_AID_DISCLAIMER = STANDARD_DISCLAIMER;

export const FIRST_AID_TOPICS: FirstAidTopic[] = [
  {
    id: 'cpr',
    title: 'CPR (adult, basic)',
    keywords: ['cpr', 'not breathing', 'no pulse', 'heart stopped', 'cardiac arrest', 'chest compressions'],
    steps: [
      'Call for emergency help immediately if it hasn\'t been done yet.',
      'Check that the scene is safe, then check if the person responds and is breathing normally.',
      'If they are not breathing normally, lay them on their back on a firm surface.',
      'Kneel beside them and place the heel of one hand on the center of their chest, other hand on top, fingers interlaced.',
      'Push hard and fast, about 2 inches deep, at a rate of 100-120 compressions per minute, letting the chest fully rise between pushes.',
      'Continue compressions until the person shows signs of life or officials/paramedics arrive and take over.',
    ],
  },
  {
    id: 'choking',
    title: 'Choking (Heimlich maneuver)',
    keywords: ['choking', 'choke', 'can\'t breathe', 'cant breathe', 'something stuck in throat', 'heimlich'],
    steps: [
      'Ask the person if they are choking; if they can cough or speak, encourage them to keep coughing.',
      'If they cannot breathe, cough, or speak, stand behind them and wrap your arms around their waist.',
      'Make a fist with one hand, thumb side against their stomach, just above the navel.',
      'Grasp your fist with the other hand and give quick, upward thrusts.',
      'Repeat until the object is expelled or the person becomes unresponsive, then begin CPR and wait for officials.',
    ],
  },
  {
    id: 'bleeding',
    title: 'Severe bleeding',
    keywords: ['bleeding', 'blood', 'wound', 'cut', 'gash', 'hemorrhage'],
    steps: [
      'If possible, wear gloves or use a barrier to avoid direct contact with blood.',
      'Apply firm, direct pressure to the wound with a clean cloth or bandage.',
      'Keep pressing without lifting the cloth to check — add more layers on top if it soaks through.',
      'If possible, raise the injured area above the level of the heart.',
      'Keep the person still and warm, and maintain pressure until officials arrive to take over.',
    ],
  },
  {
    id: 'burns',
    title: 'Burns',
    keywords: ['burn', 'burned', 'burnt', 'scald'],
    steps: [
      'Move the person away from the source of the burn if it is safe to do so.',
      'Cool the burn under cool (not ice-cold) running water for about 10-20 minutes.',
      'Remove tight items like jewelry near the burn before swelling starts, if it can be done gently.',
      'Cover the burn loosely with a clean, non-stick cloth. Do not apply creams, ice, or burst any blisters.',
      'Keep the person calm and comfortable until officials arrive.',
    ],
  },
  {
    id: 'shock',
    title: 'Shock',
    keywords: ['shock', 'pale', 'clammy', 'fainting', 'faint', 'dizzy'],
    steps: [
      'Have the person lie down if possible and, if there is no suspected spinal or leg injury, raise their legs slightly.',
      'Keep them warm with a blanket or jacket.',
      'Do not give them food or water.',
      'Loosen any tight clothing and keep monitoring that they are breathing.',
      'Stay with them and keep them calm until officials arrive.',
    ],
  },
  {
    id: 'unconscious',
    title: 'Unconsciousness / recovery position',
    keywords: ['unconscious', 'unresponsive', 'passed out', 'not waking up', 'recovery position'],
    steps: [
      'Check if the person responds to your voice or a gentle shake of the shoulders.',
      'If they are breathing but unresponsive, gently roll them onto their side into the recovery position to keep their airway clear.',
      'Tilt their head back slightly to help keep the airway open.',
      'Keep monitoring their breathing continuously.',
      'If they stop breathing normally at any point, begin CPR and wait for officials.',
    ],
  },
  {
    id: 'fracture',
    title: 'Suspected broken bone / fracture',
    keywords: ['broken arm', 'broken leg', 'broken bone', 'fracture', 'fractured', 'dislocated', 'dislocation', 'snapped bone'],
    steps: [
      'Encourage the person to stay still and avoid moving the injured limb — do not try to straighten or push it back into place.',
      'If there is an open wound near the break, cover it loosely with a clean cloth to reduce bleeding and contamination, without pressing on the bone.',
      'Support the area above and below the injury with your hands, a rolled towel, or a splint made from a rigid item (like a magazine) if you have one, just enough to stop it moving.',
      'Loosely wrap or tie the splint in place — not tight enough to cut off circulation. Check fingers/toes past the injury stay warm and normal in color.',
      'Apply a cold pack wrapped in cloth to reduce swelling if available, and keep the person warm and calm.',
      'Do not give them food or water in case they need surgery, and wait for officials/paramedics to take over transport and treatment.',
    ],
  },
  {
    id: 'sprain',
    title: 'Sprain / strain',
    keywords: ['sprain', 'sprained', 'twisted ankle', 'twisted knee', 'strain', 'pulled muscle'],
    steps: [
      'Have the person rest and avoid putting weight on the injured area.',
      'Apply an ice pack wrapped in cloth for about 15-20 minutes to reduce swelling.',
      'Wrap the area gently with a bandage for support, not too tight.',
      'Elevate the injured limb above heart level if possible.',
      'If the pain is severe or the area looks deformed, treat it as a possible fracture instead and wait for officials.',
    ],
  },
  {
    id: 'head-injury',
    title: 'Head injury',
    keywords: ['head injury', 'hit their head', 'hit his head', 'hit her head', 'concussion', 'head trauma'],
    steps: [
      'Keep the person still and avoid moving their neck, in case of spinal injury.',
      'If there is bleeding, apply gentle pressure with a clean cloth without pressing hard on the skull.',
      'Watch for confusion, vomiting, unequal pupils, drowsiness, or if they lose consciousness — mention any of these to responders right away.',
      'Do not let them eat, drink, or take painkillers until officials or medical staff have checked them.',
      'Keep them calm, still, and warm until officials arrive to assess further.',
    ],
  },
  {
    id: 'nosebleed',
    title: 'Nosebleed',
    keywords: ['nosebleed', 'nose bleed', 'bleeding nose'],
    steps: [
      'Have the person sit up and lean slightly forward, not backward.',
      'Pinch the soft part of the nose shut and hold for about 10 minutes without letting go to check.',
      'Have them breathe through their mouth and avoid blowing their nose during this time.',
      'Apply a cold pack to the bridge of the nose if available.',
      'If bleeding doesn\'t stop after 10-15 minutes or follows a head injury, treat as more serious and wait for officials.',
    ],
  },
  {
    id: 'seizure',
    title: 'Seizure',
    keywords: ['seizure', 'convulsing', 'convulsion', 'fitting'],
    steps: [
      'Clear the area around them of anything hard or sharp they could hit.',
      'Do not hold them down or put anything in their mouth.',
      'Cushion their head with something soft, like a folded jacket.',
      'Once the seizure stops, gently roll them onto their side (recovery position) and check their breathing.',
      'Stay with them and keep them calm as they come around, and wait for officials to arrive.',
    ],
  },
];

export function matchFirstAidTopic(message: string): FirstAidTopic | null {
  const normalized = message.toLowerCase();
  for (const topic of FIRST_AID_TOPICS) {
    if (topic.keywords.some((keyword) => normalized.includes(keyword))) {
      return topic;
    }
  }
  return null;
}

const ESCALATION_KEYWORDS = [
  'not breathing',
  'no pulse',
  'unconscious',
  'unresponsive',
  'cardiac arrest',
  'severe bleeding',
  'heavy bleeding',
  'choking',
  'seizure',
  'not waking up',
];

export function shouldEscalate(message: string): boolean {
  const normalized = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
