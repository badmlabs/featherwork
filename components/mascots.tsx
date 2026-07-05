import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { MascotId } from '../constants/customization';
import { sora } from '../constants/theme';

/**
 * Full-body mascot art, transcribed 1:1 from the Customization design mockup
 * (56 x 76 viewBox per figure). The jersey band and the number chip take the
 * player's marker color; the chip is a plain RN overlay so it stays readable
 * when the figure is mirrored for left-handed players.
 */

interface ArtProps {
  band: string;
  /** Back view (near-court players): same figure minus face/front-only details. */
  back?: boolean;
}

interface MascotArt {
  /** Number-chip center + radius in the 56x76 art space (rotations baked in). */
  chip: { x: number; y: number; r: number };
  defs: () => React.ReactElement;
  /** Head-only group in its raw 48-unit space (used for avatar chips). */
  head: (p: ArtProps) => React.ReactElement;
  body: (p: ArtProps) => React.ReactElement;
}

/** Standard racket held to the figure's upper right. */
const Racket = ({ transform = 'rotate(18 46 22)' }: { transform?: string }) => (
  <G transform={transform}>
    <Ellipse
      cx={46}
      cy={17.5}
      rx={5}
      ry={6.2}
      fill="rgba(255,255,255,0.34)"
      stroke="#E5C384"
      strokeWidth={1.8}
    />
    <Path d="M43.9 14.5v6.2M48.1 14.5v6.2M43 17.5h6" stroke="#E5C384" strokeWidth={0.6} />
    <Path d="M46 23.9v9.5" stroke="#E5C384" strokeWidth={2.3} strokeLinecap="round" />
  </G>
);

// ─── Panda ───────────────────────────────────────────────────────────────

const pandaHead = ({ band, back }: ArtProps) => (
  <>
    <Circle cx={11} cy={13} r={6} fill="url(#mEyeDark)" stroke="#fff" strokeWidth={2} />
    <Circle cx={37} cy={13} r={6} fill="url(#mEyeDark)" stroke="#fff" strokeWidth={2} />
    <Circle cx={24} cy={27} r={15.5} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Rect x={10.5} y={17} width={27} height={5} rx={2.5} fill={band} stroke="#fff" strokeWidth={1} />
    {!back && (
      <>
        <Ellipse cx={17.6} cy={27.5} rx={4} ry={5} transform="rotate(-18 17.6 27.5)" fill="url(#mEyeDark)" />
        <Ellipse cx={30.4} cy={27.5} rx={4} ry={5} transform="rotate(18 30.4 27.5)" fill="url(#mEyeDark)" />
        <Circle cx={18.6} cy={26.6} r={1.5} fill="#fff" />
        <Circle cx={29.4} cy={26.6} r={1.5} fill="#fff" />
        <Ellipse cx={24} cy={33.4} rx={2.4} ry={1.8} fill="#20242B" />
      </>
    )}
  </>
);

const panda: MascotArt = {
  chip: { x: 28, y: 52.5, r: 4.9 },
  defs: () => (
    <>
      <RadialGradient id="mFace" cx="35%" cy="28%" r="80%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="60%" stopColor="#F5F4F2" />
        <Stop offset="100%" stopColor="#D3D1CD" />
      </RadialGradient>
      <RadialGradient id="mEyeDark" cx="35%" cy="30%" r="85%">
        <Stop offset="0%" stopColor="#454C58" />
        <Stop offset="100%" stopColor="#14171C" />
      </RadialGradient>
    </>
  ),
  head: pandaHead,
  body: ({ band, back }) => (
    <>
      <Racket />
      <Path d="M20.5 40 14 48" stroke="#20242B" strokeWidth={4.6} strokeLinecap="round" />
      <Path d="M35.5 40 43.5 32.5" stroke="#20242B" strokeWidth={4.6} strokeLinecap="round" />
      <Path d="M24 56.5v6" stroke="#20242B" strokeWidth={4.8} strokeLinecap="round" />
      <Path d="M32 56.5v6" stroke="#20242B" strokeWidth={4.8} strokeLinecap="round" />
      <Ellipse cx={28} cy={47.5} rx={11} ry={11} fill="#F7F6F4" stroke="#fff" strokeWidth={1.8} />
      <Path d="M17.8 41.4 Q28 46.6 38.2 41.4 L38.2 46.2 Q28 51.2 17.8 46.2 Z" fill="#20242B" />
      <Ellipse cx={23.2} cy={64.4} rx={4.4} ry={2.6} fill="#FAF7F0" stroke="#CFC7B6" strokeWidth={1} />
      <Ellipse cx={32.8} cy={64.4} rx={4.4} ry={2.6} fill="#FAF7F0" stroke="#CFC7B6" strokeWidth={1} />
      <G transform="translate(8.8,3) scale(0.8)">{pandaHead({ band, back })}</G>
    </>
  ),
};

// ─── Fox ─────────────────────────────────────────────────────────────────

const foxHead = ({ band, back }: ArtProps) => (
  <>
    <Path d="M7.5 6.5 L19 11.5 L10 20 Z" fill="url(#mFace)" stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
    <Path d="M40.5 6.5 L29 11.5 L38 20 Z" fill="url(#mFace)" stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
    <Circle cx={24} cy={27} r={15} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Ellipse cx={17} cy={14.8} rx={4.4} ry={2} fill="#fff" opacity={0.4} transform="rotate(-16 17 14.8)" />
    <Rect x={11} y={17.5} width={26} height={5} rx={2.5} fill={band} stroke="#fff" strokeWidth={1} />
    {!back && (
      <>
        <Ellipse cx={24} cy={34.5} rx={8.5} ry={6} fill="#FDF6EC" />
        <Circle cx={17.5} cy={26.5} r={1.9} fill="#3A2417" />
        <Circle cx={30.5} cy={26.5} r={1.9} fill="#3A2417" />
        <Circle cx={18.2} cy={25.9} r={0.7} fill="#fff" />
        <Circle cx={31.2} cy={25.9} r={0.7} fill="#fff" />
        <Ellipse cx={24} cy={31.8} rx={2.3} ry={1.8} fill="#3A2417" />
      </>
    )}
  </>
);

const fox: MascotArt = {
  chip: { x: 28, y: 50.8, r: 4.9 },
  defs: () => (
    <RadialGradient id="mFace" cx="35%" cy="28%" r="80%">
      <Stop offset="0%" stopColor="#FCB169" />
      <Stop offset="55%" stopColor="#E98A3E" />
      <Stop offset="100%" stopColor="#C06722" />
    </RadialGradient>
  ),
  head: foxHead,
  body: ({ band, back }) => (
    <>
      <Racket />
      <Path
        d="M21.5 52 Q7 51 6 60.5 Q5.6 67.5 14.5 66 Q21 64.6 23 57.5 Z"
        fill="#E98A3E"
        stroke="#fff"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M6.6 59.2 Q5.6 66.8 14 65.9 Q11.6 61 6.6 59.2 Z" fill="#FDF6EC" />
      <Path d="M20.5 40 14 48" stroke="#E98A3E" strokeWidth={4.4} strokeLinecap="round" />
      <Path d="M35.5 40 43.5 32.5" stroke="#E98A3E" strokeWidth={4.4} strokeLinecap="round" />
      <Circle cx={13.7} cy={48.2} r={2.5} fill="#3A2417" />
      <Circle cx={43.8} cy={32.3} r={2.5} fill="#3A2417" />
      <Path d="M24 55.5v6.5" stroke="#3A2417" strokeWidth={4.4} strokeLinecap="round" />
      <Path d="M32 55.5v6.5" stroke="#3A2417" strokeWidth={4.4} strokeLinecap="round" />
      <Ellipse cx={28} cy={46.5} rx={9} ry={10.5} fill="#E98A3E" stroke="#fff" strokeWidth={1.8} />
      {!back && <Ellipse cx={28} cy={44} rx={5.4} ry={5.8} fill="#FDF6EC" />}
      <Ellipse cx={23.2} cy={64} rx={4.4} ry={2.6} fill="#FAF7F0" stroke="#CFC7B6" strokeWidth={1} />
      <Ellipse cx={32.8} cy={64} rx={4.4} ry={2.6} fill="#FAF7F0" stroke="#CFC7B6" strokeWidth={1} />
      <G transform="translate(8.8,3) scale(0.8)">{foxHead({ band, back })}</G>
    </>
  ),
};

// ─── Bear · jump smash ───────────────────────────────────────────────────

const bearHead = ({ band, back }: ArtProps) => (
  <>
    <Circle cx={11.5} cy={13} r={6} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Circle cx={36.5} cy={13} r={6} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Circle cx={11.5} cy={13} r={2.6} fill="#E3C9A8" />
    <Circle cx={36.5} cy={13} r={2.6} fill="#E3C9A8" />
    <Circle cx={24} cy={27} r={15.5} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Ellipse cx={17.2} cy={14.6} rx={4.4} ry={2} fill="#fff" opacity={0.35} transform="rotate(-16 17.2 14.6)" />
    <Rect x={10.5} y={17} width={27} height={5} rx={2.5} fill={band} stroke="#fff" strokeWidth={1} />
    {!back && (
      <>
        <Ellipse cx={24} cy={34} rx={7.5} ry={5.6} fill="#EAD2AE" />
        <Ellipse cx={24} cy={31.6} rx={2.5} ry={2} fill="#3A2417" />
        <Circle cx={17.5} cy={26} r={1.9} fill="#3A2417" />
        <Circle cx={30.5} cy={26} r={1.9} fill="#3A2417" />
        <Circle cx={18.2} cy={25.4} r={0.7} fill="#fff" />
        <Circle cx={31.2} cy={25.4} r={0.7} fill="#fff" />
      </>
    )}
  </>
);

const bear: MascotArt = {
  // Chip sits inside the rotate(-10 28 42) group; overlay position is the
  // rotated location of (28, 38.5).
  chip: { x: 27.4, y: 38.6, r: 4.9 },
  defs: () => (
    <RadialGradient id="mFace" cx="35%" cy="28%" r="80%">
      <Stop offset="0%" stopColor="#C4915F" />
      <Stop offset="55%" stopColor="#A9764B" />
      <Stop offset="100%" stopColor="#855931" />
    </RadialGradient>
  ),
  head: bearHead,
  body: ({ band, back }) => (
    <>
      <Path d="M43.2 8.6 41 5M43.2 8.6 43.6 4.4M43.2 8.6 45.6 5.2" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" />
      <Circle cx={43.2} cy={10.2} r={2} fill="#fff" />
      <G transform="rotate(34 44 21)">
        <Ellipse cx={44} cy={17} rx={4.8} ry={5.8} fill="rgba(255,255,255,0.34)" stroke="#E5C384" strokeWidth={1.8} />
        <Path d="M42.2 14v6M45.8 14v6M41.2 17h5.6" stroke="#E5C384" strokeWidth={0.6} />
        <Path d="M44 23v7.5" stroke="#E5C384" strokeWidth={2.2} strokeLinecap="round" />
      </G>
      <G transform="rotate(-10 28 42)">
        <Path d="M35 37.5 39.5 29.5" stroke="#A9764B" strokeWidth={5.2} strokeLinecap="round" />
        <Path d="M20.5 38.5 13.5 33.5" stroke="#A9764B" strokeWidth={5.2} strokeLinecap="round" />
        <Path d="M24.5 52.5 19 60" stroke="#A9764B" strokeWidth={5.2} strokeLinecap="round" />
        <Path d="M32 52.5 27.5 61.5" stroke="#A9764B" strokeWidth={5.2} strokeLinecap="round" />
        <Ellipse cx={17.9} cy={61.5} rx={4} ry={2.7} transform="rotate(-38 17.9 61.5)" fill="#8A5C36" stroke="#66412A" strokeWidth={1} />
        <Ellipse cx={26.6} cy={63.3} rx={4} ry={2.7} transform="rotate(-30 26.6 63.3)" fill="#8A5C36" stroke="#66412A" strokeWidth={1} />
        <Ellipse cx={28} cy={44} rx={12.5} ry={11.5} fill="#A9764B" stroke="#fff" strokeWidth={1.8} />
        {!back && <Ellipse cx={28} cy={46.5} rx={7.2} ry={7.2} fill="#EAD2AE" />}
        <G transform="translate(8.8,1.5) scale(0.8)">{bearHead({ band, back })}</G>
      </G>
      <Path d="M13 69 q9 3.5 19 0" stroke="rgba(255,255,255,0.3)" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M18 72.5 q7 2.5 13 0" stroke="rgba(255,255,255,0.2)" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </>
  ),
};

// ─── Tiger · sprint ──────────────────────────────────────────────────────

const tigerHead = ({ band, back }: ArtProps) => (
  <>
    <Circle cx={12} cy={13.5} r={5.5} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Circle cx={36} cy={13.5} r={5.5} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Circle cx={24} cy={27} r={15.5} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Ellipse cx={17.2} cy={14.6} rx={4.4} ry={2} fill="#fff" opacity={0.4} transform="rotate(-16 17.2 14.6)" />
    <Rect x={10.5} y={17} width={27} height={5} rx={2.5} fill={band} stroke="#fff" strokeWidth={1} />
    <Path d="M24 22.8v4" stroke="#20242B" strokeWidth={2.4} strokeLinecap="round" />
    {!back && (
      <>
        <Path d="M10 26.5l4.4 1.6M38 26.5l-4.4 1.6" stroke="#20242B" strokeWidth={2.2} strokeLinecap="round" />
        <Ellipse cx={24} cy={34.2} rx={7} ry={5.2} fill="#FCF6EC" />
        <Ellipse cx={24} cy={31.6} rx={2.3} ry={1.7} fill="#20242B" />
        <Circle cx={17.3} cy={27.2} r={1.9} fill="#20242B" />
        <Circle cx={30.7} cy={27.2} r={1.9} fill="#20242B" />
        <Circle cx={18} cy={26.6} r={0.7} fill="#fff" />
        <Circle cx={31.4} cy={26.6} r={0.7} fill="#fff" />
      </>
    )}
  </>
);

const tiger: MascotArt = {
  // rotate(12 28 46) applied to (28, 41.8).
  chip: { x: 28.9, y: 41.9, r: 4.9 },
  defs: () => (
    <RadialGradient id="mFace" cx="35%" cy="28%" r="80%">
      <Stop offset="0%" stopColor="#FFB65F" />
      <Stop offset="55%" stopColor="#F49B38" />
      <Stop offset="100%" stopColor="#CE7519" />
    </RadialGradient>
  ),
  head: tigerHead,
  body: ({ band, back }) => (
    <>
      <Path d="M3 36h8M1.5 44h9M4 52h7" stroke="rgba(255,255,255,0.38)" strokeWidth={1.8} strokeLinecap="round" />
      <G transform="rotate(12 28 46)">
        <Path d="M18.5 49.5 Q9 47 6.5 40" stroke="#F49B38" strokeWidth={3.4} fill="none" strokeLinecap="round" />
        <Path d="M12 44.9l1.7-2.5M8.8 41.6l1.8-2.3" stroke="#20242B" strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M21 40 14 44.5" stroke="#F49B38" strokeWidth={4.6} strokeLinecap="round" />
        <Path d="M35 40 43 45" stroke="#F49B38" strokeWidth={4.6} strokeLinecap="round" />
        <Ellipse cx={49.5} cy={45.5} rx={5.6} ry={4.7} fill="rgba(255,255,255,0.34)" stroke="#E5C384" strokeWidth={1.8} />
        <Path d="M47 43.7h5M47 47.3h5M49.5 42.2v6.6" stroke="#E5C384" strokeWidth={0.6} />
        <Path d="M44.6 45.4 43 45.2" stroke="#E5C384" strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M25 52.5 16.5 58.5" stroke="#F49B38" strokeWidth={4.6} strokeLinecap="round" />
        <Path d="M31 52.5 38 60.5" stroke="#F49B38" strokeWidth={4.6} strokeLinecap="round" />
        <Ellipse cx={14.9} cy={59.3} rx={4.3} ry={2.5} transform="rotate(-22 14.9 59.3)" fill="#FAF7F0" stroke="#CFC7B6" strokeWidth={1} />
        <Ellipse cx={39.7} cy={62} rx={4.3} ry={2.5} transform="rotate(20 39.7 62)" fill="#FAF7F0" stroke="#CFC7B6" strokeWidth={1} />
        <Ellipse cx={28} cy={45.5} rx={10} ry={10.5} fill="#F49B38" stroke="#fff" strokeWidth={1.8} />
        {!back && <Ellipse cx={28} cy={48.5} rx={5.5} ry={6} fill="#FCF6EC" />}
        <Path d="M19 41q2.6 1.4 4.6 1M37 41q-2.6 1.4-4.6 1M25.5 36.6q2.5 1.2 5 0" stroke="#20242B" strokeWidth={1.9} fill="none" strokeLinecap="round" />
        <G transform="translate(8.8,3) scale(0.8)">{tigerHead({ band, back })}</G>
      </G>
      <Circle cx={11} cy={64} r={1.6} fill="rgba(255,255,255,0.28)" />
      <Circle cx={7} cy={60} r={1.1} fill="rgba(255,255,255,0.2)" />
    </>
  ),
};

// ─── Frog · flying leap ──────────────────────────────────────────────────

const frogHead = ({ band, back }: ArtProps) => (
  <>
    <Circle cx={14} cy={12.5} r={5.8} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Circle cx={34} cy={12.5} r={5.8} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Circle cx={24} cy={27.5} r={15} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    {!back && (
      <>
        <Circle cx={14} cy={12.5} r={2.9} fill="#fff" />
        <Circle cx={34} cy={12.5} r={2.9} fill="#fff" />
        <Circle cx={14.6} cy={13} r={1.5} fill="#20302B" />
        <Circle cx={33.4} cy={13} r={1.5} fill="#20302B" />
        <Circle cx={15.1} cy={12.5} r={0.6} fill="#fff" />
        <Circle cx={33.9} cy={12.5} r={0.6} fill="#fff" />
      </>
    )}
    <Ellipse cx={17.5} cy={16.2} rx={4} ry={1.9} fill="#fff" opacity={0.35} transform="rotate(-14 17.5 16.2)" />
    <Rect x={11} y={18.5} width={26} height={5} rx={2.5} fill={band} stroke="#fff" strokeWidth={1} />
    {!back && (
      <>
        <Path d="M16 31 Q24 37.5 32 31" fill="none" stroke="#20402A" strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={20.5} cy={27.5} r={1.2} fill="#20402A" />
        <Circle cx={27.5} cy={27.5} r={1.2} fill="#20402A" />
      </>
    )}
  </>
);

const frog: MascotArt = {
  // translate(0,-2) applied to (28, 40.5).
  chip: { x: 28, y: 38.5, r: 4.9 },
  defs: () => (
    <RadialGradient id="mFace" cx="35%" cy="28%" r="80%">
      <Stop offset="0%" stopColor="#7CC862" />
      <Stop offset="55%" stopColor="#58A843" />
      <Stop offset="100%" stopColor="#3F8A2B" />
    </RadialGradient>
  ),
  head: frogHead,
  body: ({ band, back }) => (
    <>
      <G transform="translate(0,-2)">
        <Racket transform="rotate(30 46 26)" />
        <Path d="M20 38 12.5 30.5" stroke="#58A843" strokeWidth={4.4} strokeLinecap="round" />
        <Path d="M36 38 43 31.5" stroke="#58A843" strokeWidth={4.4} strokeLinecap="round" />
        <Path d="M23 50.5 15.5 52.5 13.5 59" stroke="#58A843" strokeWidth={4.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M33 50.5 40.5 52.5 42.5 59" stroke="#58A843" strokeWidth={4.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M13.5 59l-2.4 2.3M13.5 59l.2 3.3M13.5 59l2.5 2.1" stroke="#58A843" strokeWidth={2} strokeLinecap="round" />
        <Path d="M42.5 59l2.4 2.3M42.5 59l-.2 3.3M42.5 59l-2.5 2.1" stroke="#58A843" strokeWidth={2} strokeLinecap="round" />
        <Ellipse cx={28} cy={44} rx={8.5} ry={9} fill="#58A843" stroke="#fff" strokeWidth={1.8} />
        {!back && <Ellipse cx={28} cy={46.5} rx={5} ry={5.8} fill="#D9EFC2" />}
        <G transform="translate(8.8,1.5) scale(0.8)">{frogHead({ band, back })}</G>
      </G>
      <Path d="M16 70.5 q12 4.5 24 0" stroke="rgba(255,255,255,0.28)" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Circle cx={9} cy={50} r={1.2} fill="rgba(255,255,255,0.35)" />
      <Circle cx={47.5} cy={50} r={1.2} fill="rgba(255,255,255,0.35)" />
    </>
  ),
};

// ─── Penguin · slide save ────────────────────────────────────────────────

const penguinHead = ({ band, back }: ArtProps) => (
  <>
    <Circle cx={24} cy={26} r={16} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Ellipse cx={17} cy={13.6} rx={4.4} ry={2} fill="#fff" opacity={0.25} transform="rotate(-16 17 13.6)" />
    {!back && <Ellipse cx={24} cy={30} rx={10} ry={8.6} fill="#FAF8F3" />}
    <Rect x={10} y={16} width={28} height={5} rx={2.5} fill={band} stroke="#fff" strokeWidth={1} />
    {!back && (
      <>
        <Circle cx={18.5} cy={27} r={1.9} fill="#20242B" />
        <Circle cx={29.5} cy={27} r={1.9} fill="#20242B" />
        <Circle cx={19.2} cy={26.4} r={0.7} fill="#fff" />
        <Circle cx={30.2} cy={26.4} r={0.7} fill="#fff" />
        <Path d="M21.2 30 L26.8 30 L24 34 Z" fill="#F49B38" strokeLinejoin="round" />
      </>
    )}
  </>
);

const penguin: MascotArt = {
  chip: { x: 21, y: 48, r: 4.6 },
  defs: () => (
    <RadialGradient id="mFace" cx="35%" cy="28%" r="80%">
      <Stop offset="0%" stopColor="#465364" />
      <Stop offset="55%" stopColor="#28323E" />
      <Stop offset="100%" stopColor="#171E27" />
    </RadialGradient>
  ),
  head: penguinHead,
  body: ({ band, back }) => (
    <>
      <Path d="M2 47h9M3.5 54h11M2 61h8" stroke="rgba(255,255,255,0.35)" strokeWidth={1.8} strokeLinecap="round" />
      <Ellipse cx={30} cy={69} rx={19} ry={3} fill="rgba(0,0,0,0.3)" />
      <Path d="M14 50 7.5 45" stroke="#28323E" strokeWidth={4.4} strokeLinecap="round" />
      <Path d="M13.5 56 7 56.5" stroke="#28323E" strokeWidth={4.4} strokeLinecap="round" />
      <Ellipse cx={6.4} cy={44} rx={3.6} ry={2.2} transform="rotate(-35 6.4 44)" fill="#F49B38" stroke="#C87A20" strokeWidth={1} />
      <Ellipse cx={5.4} cy={56.8} rx={3.6} ry={2.2} transform="rotate(8 5.4 56.8)" fill="#F49B38" stroke="#C87A20" strokeWidth={1} />
      <Ellipse cx={25.5} cy={50.5} rx={14} ry={8.8} transform="rotate(-6 25.5 50.5)" fill="#28323E" stroke="#fff" strokeWidth={1.8} />
      {!back && <Ellipse cx={27} cy={52.3} rx={10.2} ry={5.2} transform="rotate(-6 27 52.3)" fill="#FAF8F3" />}
      <Path d="M31 55 37.5 60.5" stroke="#28323E" strokeWidth={4.4} strokeLinecap="round" />
      <Path d="M37 47.5 44 51.5" stroke="#28323E" strokeWidth={4.4} strokeLinecap="round" />
      <Ellipse cx={49.5} cy={57.5} rx={5.4} ry={4.5} fill="rgba(255,255,255,0.34)" stroke="#E5C384" strokeWidth={1.7} />
      <Path d="M47.2 55.8h4.8M47.2 59.2h4.8M49.5 54.4v6.4" stroke="#E5C384" strokeWidth={0.55} />
      <Path d="M45.4 54.8 44 52.2" stroke="#E5C384" strokeWidth={2.1} strokeLinecap="round" />
      <G transform="translate(24.5,11) scale(0.72)">{penguinHead({ band, back })}</G>
    </>
  ),
};

// ─── Koala · gold cape ───────────────────────────────────────────────────

const koalaHead = ({ band, back }: ArtProps) => (
  <>
    <Circle cx={9.5} cy={15} r={7.5} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Circle cx={38.5} cy={15} r={7.5} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Circle cx={9.5} cy={15} r={3.4} fill="#E8B8C4" />
    <Circle cx={38.5} cy={15} r={3.4} fill="#E8B8C4" />
    <Circle cx={24} cy={27} r={15} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Ellipse cx={17.2} cy={15} rx={4.2} ry={2} fill="#fff" opacity={0.4} transform="rotate(-16 17.2 15)" />
    <Rect x={11} y={17.5} width={26} height={5} rx={2.5} fill={band} stroke="#fff" strokeWidth={1} />
    {!back && (
      <>
        <Ellipse cx={24} cy={30.5} rx={3.4} ry={4.6} fill="#3A3F47" />
        <Ellipse cx={23} cy={28.6} rx={1.1} ry={1.6} fill="#5C636D" />
        <Circle cx={16.5} cy={26.5} r={1.9} fill="#3A3F47" />
        <Circle cx={31.5} cy={26.5} r={1.9} fill="#3A3F47" />
        <Circle cx={17.2} cy={25.9} r={0.7} fill="#fff" />
        <Circle cx={32.2} cy={25.9} r={0.7} fill="#fff" />
      </>
    )}
  </>
);

const koala: MascotArt = {
  chip: { x: 28, y: 41.8, r: 4.9 },
  defs: () => (
    <RadialGradient id="mFace" cx="35%" cy="28%" r="80%">
      <Stop offset="0%" stopColor="#B6BEC9" />
      <Stop offset="55%" stopColor="#9AA2AD" />
      <Stop offset="100%" stopColor="#798190" />
    </RadialGradient>
  ),
  head: koalaHead,
  body: ({ band, back }) => (
    <>
      <Path
        d="M20.5 34.5 Q7 41 9.5 60 Q15.5 55.5 21 58 L22.5 38 Z"
        fill="#FFC94D"
        stroke="#fff"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path d="M15 44 Q13.5 52 12.5 57.5" stroke="rgba(0,0,0,0.14)" strokeWidth={1.2} fill="none" />
      <Racket />
      <Path d="M20.5 40 14 48" stroke="#9AA2AD" strokeWidth={4.8} strokeLinecap="round" />
      <Path d="M35.5 40 43.5 32.5" stroke="#9AA2AD" strokeWidth={4.8} strokeLinecap="round" />
      <Path d="M24 56v5.5" stroke="#9AA2AD" strokeWidth={4.8} strokeLinecap="round" />
      <Path d="M32 56v5.5" stroke="#9AA2AD" strokeWidth={4.8} strokeLinecap="round" />
      <Ellipse cx={28} cy={47} rx={10.5} ry={10.5} fill="#9AA2AD" stroke="#fff" strokeWidth={1.8} />
      {!back && <Ellipse cx={28} cy={49.5} rx={6} ry={6.5} fill="#D9DEE4" />}
      <Ellipse cx={23.4} cy={63.4} rx={4} ry={2.5} fill="#6E7682" stroke="#59616C" strokeWidth={1} />
      <Ellipse cx={32.6} cy={63.4} rx={4} ry={2.5} fill="#6E7682" stroke="#59616C" strokeWidth={1} />
      <G transform="translate(8.8,3) scale(0.8)">{koalaHead({ band, back })}</G>
    </>
  ),
};

// ─── Owl · night cape ────────────────────────────────────────────────────

const owlHead = ({ band, back }: ArtProps) => (
  <>
    <Path d="M11 6.5 L18.5 11 L11.5 15.5 Z" fill="url(#mFace)" stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
    <Path d="M37 6.5 L29.5 11 L36.5 15.5 Z" fill="url(#mFace)" stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
    <Circle cx={24} cy={27} r={15.5} fill="url(#mFace)" stroke="#fff" strokeWidth={2} />
    <Ellipse cx={17.2} cy={14.6} rx={4.4} ry={2} fill="#fff" opacity={0.35} transform="rotate(-16 17.2 14.6)" />
    <Rect x={10.5} y={17} width={27} height={5} rx={2.5} fill={band} stroke="#fff" strokeWidth={1} />
    {!back && (
      <>
        <Circle cx={17.2} cy={27.5} r={6} fill="#F3EADA" />
        <Circle cx={30.8} cy={27.5} r={6} fill="#F3EADA" />
        <Circle cx={17.2} cy={27.5} r={2.6} fill="#20242B" />
        <Circle cx={30.8} cy={27.5} r={2.6} fill="#20242B" />
        <Circle cx={18} cy={26.6} r={0.8} fill="#fff" />
        <Circle cx={31.6} cy={26.6} r={0.8} fill="#fff" />
        <Path d="M21.8 31.5 L26.2 31.5 L24 35.5 Z" fill="#F49B38" strokeLinejoin="round" />
      </>
    )}
  </>
);

const owl: MascotArt = {
  chip: { x: 28, y: 41.5, r: 4.9 },
  defs: () => (
    <RadialGradient id="mFace" cx="35%" cy="28%" r="80%">
      <Stop offset="0%" stopColor="#B79A72" />
      <Stop offset="55%" stopColor="#9C7C58" />
      <Stop offset="100%" stopColor="#77593A" />
    </RadialGradient>
  ),
  head: owlHead,
  body: ({ band, back }) => (
    <>
      <Path
        d="M20.5 34.5 Q7 41 9.5 60 Q15.5 55.5 21 58 L22.5 38 Z"
        fill="#1A2440"
        stroke="rgba(159,232,255,0.75)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Circle cx={13} cy={46} r={1} fill="#fff" opacity={0.85} />
      <Circle cx={16.2} cy={52.5} r={0.7} fill="#fff" opacity={0.65} />
      <Path
        d="M12 40.6 12.7 42.5 14.6 43.2 12.7 43.9 12 45.8 11.3 43.9 9.4 43.2 11.3 42.5 Z"
        fill="#9FE8FF"
        opacity={0.9}
      />
      <Racket />
      <Path d="M20 38.5 Q12.5 43 13.5 51.5 Q18.5 49.5 21 44.5 Z" fill="#9C7C58" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M16.2 47.6 Q15.8 44.6 17.8 42" stroke="rgba(255,255,255,0.35)" strokeWidth={1.1} fill="none" />
      <Path d="M36 38.5 Q42.5 35.5 44.6 31.2 Q39.5 30.8 36 34.8 Z" fill="#9C7C58" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M24 56v5" stroke="#9C7C58" strokeWidth={4} strokeLinecap="round" />
      <Path d="M32 56v5" stroke="#9C7C58" strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={28} cy={46.5} rx={10} ry={10.5} fill="#9C7C58" stroke="#fff" strokeWidth={1.8} />
      {!back && (
        <>
          <Ellipse cx={28} cy={48.5} rx={6.2} ry={7} fill="#F3EADA" />
          <Path d="M25 45.5l3 2 3-2M25 50l3 2 3-2" stroke="#B79A72" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      <Path d="M22.2 61l-2.2 2.6M24 61v3.2M25.8 61l2.2 2.6" stroke="#F49B38" strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M30.2 61l-2.2 2.6M32 61v3.2M33.8 61l2.2 2.6" stroke="#F49B38" strokeWidth={1.9} strokeLinecap="round" />
      <G transform="translate(8.8,3) scale(0.8)">{owlHead({ band, back })}</G>
    </>
  ),
};

const MASCOT_ART: Record<MascotId, MascotArt> = {
  panda,
  fox,
  bear,
  tiger,
  frog,
  penguin,
  koala,
  owl,
};

// ─── Views ───────────────────────────────────────────────────────────────

export const MASCOT_ASPECT = 76 / 56;

interface MascotViewProps {
  mascot: MascotId;
  /** Jersey band + number chip color (the player's marker color). */
  band: string;
  /** Number shown on the chip; omit to hide the chip (tiles show it though). */
  label?: string;
  width: number;
  /** Mirror so the racket lands on the correct screen side; the chip stays upright. */
  flipped?: boolean;
  /** Near-court players show their back; the chip reads as the jersey-back number. */
  facingAway?: boolean;
}

export function MascotView({ mascot, band, label, width, flipped = false, facingAway = false }: MascotViewProps) {
  const art = MASCOT_ART[mascot];
  const height = width * MASCOT_ASPECT;
  const s = width / 56;
  const chipX = flipped ? 56 - art.chip.x : art.chip.x;
  const chipR = art.chip.r * s;
  const D = art.defs;
  const B = art.body;
  return (
    <View style={{ width, height }} pointerEvents="none">
      <View style={[{ width, height }, flipped && styles.flipped]}>
        <Svg width={width} height={height} viewBox="0 0 56 76">
          <Defs>
            <D />
          </Defs>
          <B band={band} back={facingAway} />
        </Svg>
      </View>
      {label != null && (
        <View
          style={[
            styles.chip,
            {
              left: chipX * s - chipR,
              top: art.chip.y * s - chipR,
              width: chipR * 2,
              height: chipR * 2,
              borderRadius: chipR,
              backgroundColor: band,
              borderWidth: Math.max(1, 1.2 * s),
            },
          ]}
        >
          <Text style={[styles.chipText, { fontSize: chipR * 1.15 }]}>{label}</Text>
        </View>
      )}
    </View>
  );
}

interface MascotHeadViewProps {
  mascot: MascotId;
  band: string;
  size: number;
}

/** Head-only crop for small round avatars (player selector chips). */
export function MascotHeadView({ mascot, band, size }: MascotHeadViewProps) {
  const art = MASCOT_ART[mascot];
  const H = art.head;
  const D = art.defs;
  return (
    <Svg width={size} height={size} viewBox="0 2 48 42">
      <Defs>
        <D />
      </Defs>
      <H band={band} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flipped: {
    transform: [{ scaleX: -1 }],
  },
  chip: {
    position: 'absolute',
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    ...sora('700'),
    color: '#FFFFFF',
  },
});
