"use client";

import { useMemo, useState } from "react";

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

function FaqAnswerPanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <div
          className={`border-t border-[#b9e9f5]/80 px-5 pb-5 pt-2 text-sm leading-relaxed text-slate-700 transition-transform duration-300 ease-in-out ${
            open ? "translate-y-0" : "-translate-y-1"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function TherapistFaq({ officeAddress }: { officeAddress: string | null }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = useMemo<FaqItem[]>(
    () => [
      {
        question: "Jak umówić się na sesję?",
        answer: (
          <>
            <p>
              Żeby zapisać się na sesję terapii wybierz dogodną datę i godzinę w kalendarzu, a
              następnie przejdź do płatności.
            </p>
            <p className="mt-3">
              Po opłaceniu sesji (Przelewy24 lub przelew bankowy) rezerwacja zostanie
              potwierdzona, a szczegóły spotkania otrzymasz mailowo. W razie pytań lub braku
              wiadomości skontaktuj się z nami:{" "}
              <a
                href="mailto:recepcja@trzymsie.pl"
                className="font-medium text-[#37B3D6] hover:underline"
              >
                recepcja@trzymsie.pl
              </a>
            </p>
          </>
        ),
      },
      {
        question: "Gdzie odbywają się spotkania?",
        answer: officeAddress ? (
          <p>Gabinet mieści się przy {officeAddress}.</p>
        ) : (
          <p>
            Spotkania odbywają się w gabinecie terapeuty — adres znajdziesz w sekcji mapy na tej
            stronie lub w potwierdzeniu rezerwacji.
          </p>
        ),
      },
      {
        question: "Ile trwa spotkanie z terapeutą?",
        answer: (
          <p>
            Sesja indywidualna trwa 50 minut — to standardowy czas pracy w terapii CBT, który
            pozwala na efektywną i regularną pracę terapeutyczną.
          </p>
        ),
      },
      {
        question: "Ile spotkań muszę odbyć?",
        answer: (
          <>
            <p>
              Terapia poznawczo-behawioralna jest zazwyczaj krótkoterminowa i celowa. Liczba
              sesji w terapii poznawczo-behawioralnej jest zależna od potrzeb pacjenta, celów
              terapii oraz rodzaju problemu w terapii.
            </p>
            <p className="mt-3">
              Najczęściej ilość spotkań wynosi od kilku do kilkunastu, ale plan terapii jest
              ustalany indywidualnie przez terapeutę.
            </p>
          </>
        ),
      },
      {
        question: "Na czym polega terapia poznawczo-behawioralna?",
        answer: (
          <>
            <p>
              W trzymsie.pl terapeuci pracują w nurcie terapii poznawczo-behawioralnej (CBT) —
              podejściu, którego skuteczność została szeroko potwierdzona w badaniach.
            </p>
            <p className="mt-3">
              CBT koncentruje się na tym, jak myśli, emocje i zachowania wpływają na siebie
              nawzajem, pomagając wprowadzać realne zmiany i lepiej radzić sobie z trudnościami
              w codziennym funkcjonowaniu.
            </p>
            <p className="mt-3">
              Terapia poznawczo-behawioralna wspiera w różnych trudnościach życia codziennego:
              stresie, problemach w relacjach, kryzysach życiowych, żałobie, braku motywacji.
            </p>
            <p className="mt-3">
              Zgodnie z zaleceniami NICE (National Institute for Health and Care Excellence)
              terapia poznawczo-behawioralna jest skuteczną formą leczenia zaburzeń psychicznych
              takich jak depresja, zaburzenia lękowe, zaburzenia obsesyjno-kompulsyjne, zaburzenia
              osobowości i inne.
            </p>
          </>
        ),
      },
    ],
    [officeAddress],
  );

  return (
    <section className="border-t border-slate-100 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-8 text-2xl font-bold text-[#003C79]">FAQ</h2>
        <ul className="divide-y divide-[#b9e9f5] rounded-xl border border-[#b9e9f5] bg-[#fafcfd]">
          {items.map((item, index) => {
            const open = openIndex === index;
            return (
              <li key={item.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-[#F3FAFC]"
                  aria-expanded={open}
                >
                  <span className="font-medium text-[#003C79]">{item.question}</span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#9fd6e5] text-lg text-[#37B3D6] transition-[transform,background-color,color] duration-300 ease-in-out ${
                      open ? "rotate-180 bg-[#37B3D6] text-white" : "rotate-0 bg-white"
                    }`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                <FaqAnswerPanel open={open}>{item.answer}</FaqAnswerPanel>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
