import { useEffect, useMemo, useState } from 'react';
import { getPrebookingConfidence } from '../services/apiService';

const GOLD = '#D4AF37';

const CSS = `
  .confidence-heatmap {
    margin-top: 1.5rem;
    border-radius: 1.25rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 1.25rem;
  }

  .confidence-heatmap__head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .confidence-heatmap__meta {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.5rem;
    padding: 0.28rem 0.65rem;
    border-radius: 999px;
    border: 1px solid rgba(212,175,55,0.22);
    background: rgba(212,175,55,0.08);
    color: ${GOLD};
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .confidence-heatmap__grid-wrap {
    overflow-x: auto;
    padding-bottom: 0.35rem;
  }

  .confidence-heatmap__grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(128px, 1fr));
    gap: 0.85rem;
    min-width: 952px;
  }

  .confidence-heatmap__day {
    position: relative;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 1rem;
    padding: 0.95rem;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    min-height: 182px;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .confidence-heatmap__day:hover {
    transform: translateY(-2px);
    border-color: rgba(212,175,55,0.4);
  }

  .confidence-heatmap__day.is-selected {
    border-color: rgba(212,175,55,0.8);
    box-shadow: 0 0 0 1px rgba(212,175,55,0.28), 0 18px 35px rgba(0,0,0,0.22);
  }

  .confidence-heatmap__day.available {
    background: linear-gradient(180deg, rgba(26,58,26,0.95), rgba(12,26,14,0.92));
  }

  .confidence-heatmap__day.limited {
    background: linear-gradient(180deg, rgba(58,46,10,0.95), rgba(28,22,6,0.92));
  }

  .confidence-heatmap__day.waitlist {
    background: linear-gradient(180deg, rgba(58,16,16,0.95), rgba(26,10,10,0.92));
  }

  .confidence-heatmap__date {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
  }

  .confidence-heatmap__day-label {
    font-size: 1rem;
    font-weight: 800;
    color: white;
  }

  .confidence-heatmap__day-date {
    color: rgba(255,255,255,0.55);
    font-size: 0.82rem;
  }

  .confidence-heatmap__prob {
    font-size: 2rem;
    font-weight: 900;
    color: white;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .confidence-heatmap__label {
    color: rgba(255,255,255,0.58);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }

  .confidence-heatmap__fare {
    margin-top: auto;
    font-size: 1rem;
    font-weight: 800;
    color: white;
  }

  .confidence-heatmap__fare.is-surge {
    color: #f59e0b;
  }

  .confidence-heatmap__mini {
    font-size: 0.76rem;
    color: rgba(255,255,255,0.68);
    line-height: 1.45;
  }

  .confidence-heatmap__pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    width: fit-content;
    padding: 0.28rem 0.6rem;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(0,0,0,0.24);
    color: rgba(255,255,255,0.78);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .confidence-heatmap__badge {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    background: rgba(212,175,55,0.18);
    border: 1px solid rgba(212,175,55,0.35);
    color: ${GOLD};
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .confidence-heatmap__skeleton {
    min-height: 182px;
    border-radius: 1rem;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(110deg, rgba(255,255,255,0.03) 8%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.03) 33%);
    background-size: 200% 100%;
    animation: confidence-shimmer 1.2s linear infinite;
  }

  .confidence-heatmap__error {
    padding: 0.95rem 1rem;
    border-radius: 1rem;
    border: 1px solid rgba(248,113,113,0.25);
    background: rgba(248,113,113,0.08);
    color: #fca5a5;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  @keyframes confidence-shimmer {
    to {
      background-position-x: -200%;
    }
  }

  @media (max-width: 860px) {
    .confidence-heatmap {
      padding: 1rem;
    }

    .confidence-heatmap__head {
      flex-direction: column;
    }
  }
`;

function formatShortDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatProbability(probability) {
  if (probability == null) return '—';
  return `${Math.round(probability * 100)}%`;
}

function formatFare(day) {
  if (day.adjusted_fare == null) return '--';
  if (day.surge_multiplier > 1) return `🔥 ₹${day.adjusted_fare}`;
  return `₹${day.adjusted_fare}`;
}

export default function ConfidenceHeatmap({
  source,
  destination,
  seatClass,
  baseDate,
  onSelectDate,
  onDataLoaded,
}) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(baseDate || '');

  useEffect(() => {
    setSelectedDate(baseDate || '');
  }, [baseDate]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!source || !destination || !seatClass || !baseDate) {
        setDays([]);
        setError('');
        onDataLoaded?.([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await getPrebookingConfidence({
          source,
          destination,
          seatClass,
          baseDate,
        });

        if (!cancelled) {
          setDays(response);
          onDataLoaded?.(response);
        }
      } catch (err) {
        if (!cancelled) {
          setDays([]);
          setError(err?.response?.data?.error || 'RailWise confidence preview is unavailable right now.');
          onDataLoaded?.([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [source, destination, seatClass, baseDate]);

  const bestDealDate = useMemo(() => {
    return days
      .filter((day) => day.availability_status !== 'waitlist' && day.confirmation_probability != null)
      .sort((left, right) => right.confirmation_probability - left.confirmation_probability)[0]?.date;
  }, [days]);

  if (!source || !destination || !seatClass || !baseDate) {
    return null;
  }

  return (
    <>
      <style>{CSS}</style>
      <section className="confidence-heatmap">
        <div className="confidence-heatmap__head">
          <div>
            <div style={{ color: 'white', fontSize: '1rem', fontWeight: 800 }}>
              RailWise Confidence Score
            </div>
            <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.88rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Preview your best seven-day window before you search. Click a day to jump the booking form there instantly.
            </div>
          </div>
          <div className="confidence-heatmap__meta">
            <span>7-Day Smart Window</span>
          </div>
        </div>

        {error ? (
          <div className="confidence-heatmap__error">{error}</div>
        ) : (
          <div className="confidence-heatmap__grid-wrap">
            <div className="confidence-heatmap__grid">
              {loading
                ? Array.from({ length: 7 }).map((_, index) => (
                    <div className="confidence-heatmap__skeleton" key={index} />
                  ))
                : days.map((day) => (
                    <button
                      type="button"
                      key={day.date}
                      className={`confidence-heatmap__day ${day.availability_status} ${selectedDate === day.date ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedDate(day.date);
                        onSelectDate?.(day.date);
                      }}
                    >
                      {bestDealDate === day.date ? (
                        <span className="confidence-heatmap__badge">Best deal</span>
                      ) : null}

                      <div className="confidence-heatmap__date">
                        <span className="confidence-heatmap__day-label">{day.day_label}</span>
                        <span className="confidence-heatmap__day-date">{formatShortDate(day.date)}</span>
                      </div>

                      <div className="confidence-heatmap__label">Confirmation</div>
                      <div className="confidence-heatmap__prob">{formatProbability(day.confirmation_probability)}</div>

                      <div className={`confidence-heatmap__fare ${day.surge_multiplier > 1 ? 'is-surge' : ''}`}>
                        {formatFare(day)}
                      </div>

                      <div className="confidence-heatmap__mini">
                        {day.train_count > 0
                          ? `${day.train_count} train${day.train_count > 1 ? 's' : ''} · best on ${day.best_train?.train_number || '--'}`
                          : 'No train instances found'}
                      </div>

                      <span className="confidence-heatmap__pill">
                        {day.availability_status === 'available'
                          ? 'Open seats'
                          : day.availability_status === 'limited'
                            ? 'Limited'
                            : 'Waitlist'}
                      </span>
                    </button>
                  ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
