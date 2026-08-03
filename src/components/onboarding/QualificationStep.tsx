import { useNavigate } from 'react-router-dom';
import {
  LucideIcon, Mic, Tv2, Smartphone, Landmark, Gamepad2,
  Calendar, CalendarDays, CalendarClock, Flame,
  GraduationCap, Home, ClipboardList, Star, Globe,
  RefreshCw, Brain, Lightbulb, Ruler, Zap, ArrowLeft,
} from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';
import Logo from '../Logo';
import ProgressBar from './ProgressBar';
import SelectableCard from './SelectableCard';

interface StepConfig {
  question: string;
  multiSelect: boolean;
  options: { icon: LucideIcon; label: string; value: string }[];
}

const STEPS: Record<number, StepConfig> = {
  1: {
    question: 'Onde você narra?',
    multiSelect: true,
    options: [
      { icon: Mic, label: 'Rádio', value: 'radio' },
      { icon: Tv2, label: 'TV', value: 'tv' },
      { icon: Smartphone, label: 'Internet / Streaming', value: 'internet' },
      { icon: Landmark, label: 'Estádio (som local)', value: 'estadio' },
      { icon: Gamepad2, label: 'E-sports', value: 'esports' },
    ],
  },
  2: {
    question: 'Quantos jogos você narra por mês?',
    multiSelect: false,
    options: [
      { icon: Calendar, label: '1 a 4 jogos', value: '1-4' },
      { icon: CalendarDays, label: '5 a 12 jogos', value: '5-12' },
      { icon: CalendarClock, label: '13 a 20 jogos', value: '13-20' },
      { icon: Flame, label: 'Mais de 20 jogos', value: '20+' },
    ],
  },
  3: {
    question: 'Em qual nível você atua?',
    multiSelect: false,
    options: [
      { icon: GraduationCap, label: 'Amador / Universitário', value: 'amador' },
      { icon: Home, label: 'Estadual / Regional', value: 'estadual' },
      { icon: ClipboardList, label: 'Série C ou D', value: 'serie-cd' },
      { icon: Star, label: 'Série A ou B', value: 'serie-ab' },
      { icon: Globe, label: 'Copa do Brasil / Libertadores / Internacional', value: 'internacional' },
    ],
  },
  4: {
    question: 'Qual sua maior dificuldade durante a narração ao vivo?',
    multiSelect: false,
    options: [
      { icon: RefreshCw, label: 'Organizar substituições e eventos', value: 'substituicoes' },
      { icon: Brain, label: 'Lembrar nomes e números dos jogadores', value: 'nomes' },
      { icon: Lightbulb, label: 'Ter curiosidades prontas na hora certa', value: 'curiosidades' },
      { icon: Ruler, label: 'Visualizar a formação tática', value: 'tatica' },
      { icon: Zap, label: 'Perder dados quando a página cai', value: 'dados' },
    ],
  },
};

interface Props {
  step: number;
}

export default function QualificationStep({ step }: Props) {
  const navigate = useNavigate();
  const { data, setNarrationTypes, setFrequency, setLevel, setMainDifficulty } = useOnboarding();

  const config = STEPS[step];
  if (!config) return null;

  const getCurrentValue = (): string | string[] => {
    switch (step) {
      case 1: return data.narrationTypes;
      case 2: return data.frequency;
      case 3: return data.level;
      case 4: return data.mainDifficulty;
      default: return '';
    }
  };

  const handleSelect = (value: string) => {
    switch (step) {
      case 1: {
        const types = data.narrationTypes.includes(value)
          ? data.narrationTypes.filter(t => t !== value)
          : [...data.narrationTypes, value];
        setNarrationTypes(types);
        break;
      }
      case 2: setFrequency(value); break;
      case 3: setLevel(value); break;
      case 4: setMainDifficulty(value); break;
    }
  };

  const isSelected = (value: string) => {
    const current = getCurrentValue();
    if (Array.isArray(current)) return current.includes(value);
    return current === value;
  };

  const canProceed = () => {
    const current = getCurrentValue();
    if (Array.isArray(current)) return current.length > 0;
    return !!current;
  };

  const handleNext = () => {
    if (step < 4) {
      navigate(`/onboarding/${step + 1}`);
    } else {
      navigate('/onboarding/resumo');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      navigate(`/onboarding/${step - 1}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: 540, width: '100%',
        animation: 'slideLeft .3s ease-out'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Logo size="sm" />
        </div>

        {/* Progress */}
        <ProgressBar total={4} current={step - 1} />
        <p style={{
          fontSize: 11, color: 'var(--text3)', textAlign: 'center',
          marginBottom: 28, letterSpacing: 1
        }}>
          Etapa {step} de 4
        </p>

        {/* Question */}
        <h2 style={{
          fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
          color: 'var(--text)', letterSpacing: 1, marginBottom: 24, textAlign: 'center'
        }}>
          {config.question}
        </h2>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {config.options.map(opt => (
            <SelectableCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={isSelected(opt.value)}
              onClick={() => handleSelect(opt.value)}
            />
          ))}
        </div>

        {config.multiSelect && (
          <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 16 }}>
            Você pode selecionar mais de uma opção
          </p>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={handleBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', color: 'var(--text3)',
              fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
              textDecoration: 'underline'
            }}
          >
            <ArrowLeft size={13} /> Voltar
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            style={{
              flex: 1, padding: 14, background: canProceed() ? 'var(--green)' : 'var(--bg3)',
              color: canProceed() ? '#fff' : 'var(--text3)',
              fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)',
              border: 'none', borderRadius: 0, cursor: canProceed() ? 'pointer' : 'not-allowed',
              letterSpacing: 2, transition: 'all .2s'
            }}
            onMouseEnter={e => { if (canProceed()) { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            PRÓXIMO
          </button>
        </div>
      </div>
    </div>
  );
}
