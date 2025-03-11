export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink-suggestion': 'blinkSuggestion 3s ease-in-out infinite',
        'blink-left': 'blinkEye 3s ease-in-out infinite',
        'blink-right': 'blinkEye 3s ease-in-out 0.2s infinite',
        'slide-left': 'slideLeft 2s ease-in-out infinite',
        'slide-right': 'slideRight 2s ease-in-out infinite',
        'bounce-left': 'bounceLeft 1s ease-in-out infinite',
        'bounce-right': 'bounceRight 1s ease-in-out infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'success-pulse': 'successPulse 1s ease-out forwards',
        'confetti-fall': 'confettiFall 5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        blinkSuggestion: {
          '0%, 10%, 90%, 100%': { opacity: '1', transform: 'scaleY(1)' },
          '20%, 80%': { opacity: '0.8', transform: 'scaleY(1)' },
          '25%, 75%': { opacity: '0.2', transform: 'scaleY(0.1)' },
          '30%, 70%': { opacity: '0.8', transform: 'scaleY(1)' },
        },
        blinkEye: {
          '0%, 10%, 90%, 100%': { opacity: '1', transform: 'scaleY(1)' },
          '20%, 80%': { opacity: '0.8', transform: 'scaleY(1)' },
          '25%, 75%': { opacity: '0.2', transform: 'scaleY(0.1)' },
          '30%, 70%': { opacity: '0.8', transform: 'scaleY(1)' },
        },
        slideLeft: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-15px)' },
        },
        slideRight: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(15px)' },
        },
        bounceLeft: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-10px)' },
        },
        bounceRight: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
        successPulse: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '50%': { transform: 'scale(1.5)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        confettiFall: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
