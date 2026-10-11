import type { MotionProps } from 'motion/react';

/*
 * CONTEXT
 * - Problem      : Figma 키프레임을 화면별 타임라인과 함께 재현한다.
 * - Why          : 원본 snippet 값을 별도 도메인 데이터로 보관해 UI와 분리한다.
 * - Alternatives : 임의 CSS easing → 원본의 구간별 타이밍이 손실된다.
 * - Trade-offs   : 원본의 촘촘한 keyframe 배열은 유지한다.
 * - Edge Case    : shared clock, reduced motion, 기본/오류 타임라인 전환.
 */

export const loginMotion = {
  record: {
    initial: {
      opacity: 0.00316,
      rotate: 54.138,
      scaleX: 0.098,
      scaleY: 0.098,
      x: 29.758,
      y: 27.069,
    },
    animate: {
      opacity: [0.00316, 0.00316, 1, 1],
      rotate: [54.138, 54.138, 0, 0],
      scaleX: [0.098, 0.098, 1, 1],
      scaleY: [0.098, 0.098, 1, 1],
      x: [29.758, 0, 0],
      y: [27.069, -9.981, -14, 7, -6, 15, 15],
    },
    transition: {
      opacity: {
        duration: 5.051,
        times: [0, 0.0753, 0.0754, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      rotate: {
        duration: 5.051,
        times: [0, 0.1941, 0.1942, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      scaleX: {
        duration: 5.051,
        times: [0, 0.1941, 0.1942, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      scaleY: {
        duration: 5.051,
        times: [0, 0.1941, 0.1942, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      x: {
        duration: 5.051,
        times: [0, 0.1942, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      y: {
        duration: 5.051,
        times: [0, 0.1942, 0.2724, 0.5785, 0.9119, 0.9952, 1],
        ease: 'linear',
        repeat: Infinity,
      },
    },
  },
  summarize: {
    initial: {
      opacity: 0.00316,
      rotate: 54.138,
      scaleX: 0.098,
      scaleY: 0.098,
      x: 29.758,
      y: 27.069,
    },
    animate: {
      opacity: [0.00316, 0.00316, 1, 1],
      rotate: [54.138, 54.138, 0, 0],
      scaleX: [0.098, 0.098, 1, 1],
      scaleY: [0.098, 0.098, 1, 1],
      x: [29.758, 0, 0],
      y: [27.069, -15.456, -19, -9, -23, -9],
    },
    transition: {
      opacity: {
        duration: 5.051,
        times: [0, 0.0753, 0.0754, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      rotate: {
        duration: 5.051,
        times: [0, 0.1941, 0.1942, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      scaleX: {
        duration: 5.051,
        times: [0, 0.1941, 0.1942, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      scaleY: {
        duration: 5.051,
        times: [0, 0.1941, 0.1942, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      x: {
        duration: 5.051,
        times: [0, 0.1942, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      y: {
        duration: 5.051,
        times: [0, 0.1942, 0.2387, 0.5019, 0.7654, 1],
        ease: 'linear',
        repeat: Infinity,
      },
    },
  },
  pink: {
    initial: { rotate: 16.153 },
    animate: { rotate: [16.153, 1.086, 18.465, -3.027] },
    transition: {
      rotate: {
        duration: 5.051,
        times: [0, 0.2489, 0.5458, 1],
        ease: [0.5, 0, 0.5, 1],
        repeat: Infinity,
      },
    },
  },
  blue: {
    initial: { rotate: 0 },
    animate: { rotate: [0, 17.427, 5.386, 16.857, 16.857] },
    transition: {
      rotate: {
        duration: 5.051,
        times: [0, 0.396, 0.6578, 0.8967, 1],
        ease: [[0.5, 0, 0.5, 1], [0.5, 0, 0.5, 1], [0.5, 0, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
    },
  },
  organize: {
    initial: { opacity: 0, rotate: 60, scaleX: 0, scaleY: 0, x: 30, y: 30 },
    animate: {
      opacity: [0, 1, 1],
      rotate: [60, 0, 0],
      scaleX: [0, 1, 1],
      scaleY: [0, 1, 1],
      x: [
        30, 27.741, 23.725, 18.97, 14.214, 9.913, 6.308, 3.505, 1.532, 0.376, 0,
        0,
      ],
      y: [
        30, 19.702, 13.581, 8.658, 4.496, 0.928, -2.126, -4.705, -6.828, -8.497,
        -9.704, -10.674, -11.644, -12.615, -13.585, -14.556, -15, -14.367,
        -13.2, -12.033, -10.866, -9.699, -8.532, -7.365, -6.197, -5.03, -3.863,
        -2.696, -1.529, -0.362, 0, -0.934, -2.289, -3.643, -4.997, -6.351,
        -7.705, -9.06, -10.414, -11.768, -13.122, -14.477, -15.831, -17.185,
        -18.539, -19.893, -21.248, -22.602, -23, -20.022, -15.804, -11.587,
        -7.369, -3.151, -1,
      ],
    },
    transition: {
      opacity: {
        duration: 5.051,
        times: [0, 0.0792, 1],
        ease: [[0.5, 0, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
      rotate: {
        duration: 5.051,
        times: [0, 0.198, 1],
        ease: [[0.05, 0.4, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
      scaleX: {
        duration: 5.051,
        times: [0, 0.198, 1],
        ease: [[0.05, 0.4, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
      scaleY: {
        duration: 5.051,
        times: [0, 0.198, 1],
        ease: [[0.05, 0.4, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
      x: {
        duration: 5.051,
        times: [
          0, 0.0198, 0.0396, 0.0594, 0.0792, 0.099, 0.1188, 0.1386, 0.1584,
          0.1782, 0.198, 1,
        ],
        ease: 'linear',
        repeat: Infinity,
      },
      y: {
        duration: 5.051,
        times: [
          0, 0.0198, 0.0396, 0.0594, 0.0792, 0.099, 0.1188, 0.1386, 0.1584,
          0.1782, 0.198, 0.2178, 0.2376, 0.2574, 0.2772, 0.297, 0.306, 0.3168,
          0.3366, 0.3564, 0.3762, 0.396, 0.4158, 0.4356, 0.4554, 0.4752, 0.495,
          0.5147, 0.5345, 0.5543, 0.5605, 0.5741, 0.5939, 0.6137, 0.6335,
          0.6533, 0.6731, 0.6929, 0.7127, 0.7325, 0.7523, 0.7721, 0.7919,
          0.8117, 0.8315, 0.8513, 0.8711, 0.8909, 0.8967, 0.9107, 0.9305,
          0.9503, 0.9701, 0.9899, 1,
        ],
        ease: 'linear',
        repeat: Infinity,
      },
    },
  },
} satisfies Record<string, MotionProps>;

export const errorMotion = {
  record: {
    initial: {
      opacity: 0.00316,
      rotate: 54.138,
      scaleX: 0.098,
      scaleY: 0.098,
      x: 29.758,
      y: 27.069,
    },
    animate: {
      opacity: [0.00316, 0.00316, 1, 1],
      rotate: [54.138, 54.138, 0, 0],
      scaleX: [0.098, 0.098, 1, 1],
      scaleY: [0.098, 0.098, 1, 1],
      x: [29.758, 0, 0],
      y: [27.069, -9.981, -14, -5.523, 7, -6, 15],
    },
    transition: {
      opacity: {
        duration: 2,
        times: [0, 0.1904, 0.1905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      rotate: {
        duration: 2,
        times: [0, 0.4904, 0.4905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      scaleX: {
        duration: 2,
        times: [0, 0.4904, 0.4905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      scaleY: {
        duration: 2,
        times: [0, 0.4904, 0.4905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      x: {
        duration: 2,
        times: [0, 0.4905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      y: {
        duration: 2,
        times: [0, 0.4905, 0.6879, 0.9997, 0.9998, 0.9999, 1],
        ease: 'linear',
        repeat: Infinity,
      },
    },
  },
  summarize: {
    initial: {
      opacity: 0.00316,
      rotate: 54.138,
      scaleX: 0.098,
      scaleY: 0.098,
      x: 29.758,
      y: 27.069,
    },
    animate: {
      opacity: [0.00316, 0.00316, 1, 1],
      rotate: [54.138, 54.138, 0, 0],
      scaleX: [0.098, 0.098, 1, 1],
      scaleY: [0.098, 0.098, 1, 1],
      x: [29.758, 0, 0],
      y: [27.069, -15.456, -19, -13.025, -9, -23, -9],
    },
    transition: {
      opacity: {
        duration: 2,
        times: [0, 0.1904, 0.1905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      rotate: {
        duration: 2,
        times: [0, 0.4904, 0.4905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      scaleX: {
        duration: 2,
        times: [0, 0.4904, 0.4905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      scaleY: {
        duration: 2,
        times: [0, 0.4904, 0.4905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      x: {
        duration: 2,
        times: [0, 0.4905, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      y: {
        duration: 2,
        times: [0, 0.4905, 0.603, 0.9997, 0.9998, 0.9999, 1],
        ease: 'linear',
        repeat: Infinity,
      },
    },
  },
  pink: {
    initial: { rotate: 16.153 },
    animate: { rotate: [16.153, 1.086, 4.626, 9.614, 17.666, 18.465, -3.027] },
    transition: {
      rotate: {
        duration: 2,
        times: [0, 0.6285, 0.8785, 0.9997, 0.9998, 0.9999, 1],
        ease: [
          [0.5, 0, 0.5, 1],
          'linear',
          'linear',
          'linear',
          'linear',
          [0.5, 0, 0.5, 1],
        ],
        repeat: Infinity,
      },
    },
  },
  blue: {
    initial: { rotate: 0 },
    animate: { rotate: [0, 17.427, 5.386, 16.857] },
    transition: {
      rotate: {
        duration: 2,
        times: [0, 0.9998, 0.9999, 1],
        ease: [0.5, 0, 0.5, 1],
        repeat: Infinity,
      },
    },
  },
  organize: {
    initial: { opacity: 0, rotate: 60, scaleX: 0, scaleY: 0, x: 30, y: 30 },
    animate: {
      opacity: [0, 1, 1],
      rotate: [60, 0, 0],
      scaleX: [0, 1, 1],
      scaleY: [0, 1, 1],
      x: [
        30, 27.741, 23.725, 18.97, 14.214, 9.913, 6.308, 3.505, 1.532, 0.376, 0,
        0,
      ],
      y: [
        30, 19.702, 13.581, 8.658, 4.496, 0.928, -2.126, -4.705, -6.828, -8.497,
        -9.704, -10.674, -11.644, -12.615, -13.585, -14.556, -15, -14.367,
        -13.2, -12.033, -10.866, -9.699, -8.532, -7.365, -6.197, -5.03, -3.863,
        -2.696, -1.529, -0.362, 0, -0.934, -2.289, -3.643, -4.997, -6.351,
        -7.705, -9.06, -10.414, -11.768, -13.122, -14.477, -15.831, -17.185,
        -18.539, -19.893, -21.248, -22.602, -23, -20.022, -15.804, -11.587,
        -7.369, -3.151, -1,
      ],
    },
    transition: {
      opacity: {
        duration: 2,
        times: [0, 0.2, 1],
        ease: [[0.5, 0, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
      rotate: {
        duration: 2,
        times: [0, 0.5, 1],
        ease: [[0.05, 0.4, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
      scaleX: {
        duration: 2,
        times: [0, 0.5, 1],
        ease: [[0.05, 0.4, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
      scaleY: {
        duration: 2,
        times: [0, 0.5, 1],
        ease: [[0.05, 0.4, 0.5, 1], 'linear'],
        repeat: Infinity,
      },
      x: {
        duration: 2,
        times: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 1],
        ease: 'linear',
        repeat: Infinity,
      },
      y: {
        duration: 2,
        times: [
          0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6,
          0.65, 0.7, 0.75, 0.7729, 0.8, 0.85, 0.9, 0.95, 0.9967, 0.9968, 0.9969,
          0.997, 0.9971, 0.9972, 0.9973, 0.9974, 0.9975, 0.9976, 0.9977, 0.9978,
          0.9979, 0.998, 0.9981, 0.9982, 0.9983, 0.9984, 0.9985, 0.9986, 0.9987,
          0.9988, 0.9989, 0.999, 0.9991, 0.9992, 0.9993, 0.9994, 0.9995, 0.9996,
          0.9997, 0.9998, 0.9999, 1,
        ],
        ease: 'linear',
        repeat: Infinity,
      },
    },
  },
} satisfies Record<string, MotionProps>;
