import React from 'react';

interface SchoolStampProps {
  date: string | null;
}

export const SchoolStamp: React.FC<SchoolStampProps> = ({ date }) => {
  // Format the date to "DD MMM YYYY" (e.g., "03 JUN 2022")
  const formattedDate = React.useMemo(() => {
    if (!date) return '   ---   ';
    try {
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return '   ---   ';
    }
  }, [date]);

  return (
    <div className="school-stamp-container" style={stampStyles.container}>
      <div style={stampStyles.leftSide}>
        <div style={stampStyles.verticalTextLeft}>HEADTEACHER'S OFFICE</div>
        <img src="/school_budge.jpeg" alt="Badge" style={stampStyles.badge} />
      </div>

      <div style={stampStyles.centerContent}>
        <div style={stampStyles.schoolName}>
          JIDDAH ISLAMIC SCHOOLS
        </div>
        <div style={stampStyles.dateText}>{formattedDate}</div>
        <div style={stampStyles.headteacher}>HEADTEACHER</div>
        <div style={stampStyles.address}>
          P.O.Box 34008, Nsaggu<br />
          Nakawuka Rd, Wakiso District
        </div>
      </div>

      <div style={stampStyles.rightSide}>
        <div style={stampStyles.crescentStar}>☪</div>
        <div style={stampStyles.verticalTextRight}>HEADTEACHER'S OFFICE</div>
      </div>
    </div>
  );
};

const stampStyles = {
  container: {
    width: '7.5cm',
    height: '3.8cm',
    border: '2px solid #1e40af', // Deep blue
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px',
    color: '#1e40af', // Deep blue text
    fontFamily: '"Times New Roman", Times, serif',
    transform: 'rotate(-2deg)',
    mixBlendMode: 'multiply' as any,
    opacity: 0.85, // Give it that ink fade
    boxSizing: 'border-box' as any,
    background: 'transparent',
    margin: '10px auto',
  },
  leftSide: {
    display: 'flex',
    flexDirection: 'row' as any,
    alignItems: 'center',
    width: '1.2cm',
  },
  verticalTextLeft: {
    writingMode: 'vertical-rl' as any,
    transform: 'rotate(180deg)',
    fontSize: '6px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginRight: '2px',
    textAlign: 'center' as any,
  },
  badge: {
    width: '0.9cm',
    height: '1.1cm',
    objectFit: 'contain' as any,
    filter: 'sepia(1) hue-rotate(180deg) saturate(300%) contrast(200%) opacity(0.8)', // Attempt to turn black logo blue
  },
  centerContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as any,
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'center' as any,
    paddingTop: '2px',
    paddingBottom: '2px',
  },
  schoolName: {
    fontSize: '11px',
    fontWeight: 'bold',
    lineHeight: '1.1',
    letterSpacing: '0.5px',
  },
  dateText: {
    color: '#ef4444', // Red stamp ink
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    margin: '4px 0',
    opacity: 0.9,
  },
  headteacher: {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  address: {
    fontSize: '9px',
    fontWeight: 'bold',
    lineHeight: '1.1',
  },
  rightSide: {
    display: 'flex',
    flexDirection: 'row' as any,
    alignItems: 'center',
    width: '1.2cm',
    justifyContent: 'flex-end',
  },
  crescentStar: {
    fontSize: '24px',
    marginRight: '4px',
    lineHeight: 1,
    marginBottom: '20px',
  },
  verticalTextRight: {
    writingMode: 'vertical-rl' as any,
    fontSize: '6px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginLeft: '2px',
    textAlign: 'center' as any,
  },
};
