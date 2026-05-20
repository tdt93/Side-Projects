"use client";

import { useRef, useState } from "react";
import { deleteTherapistAction } from "@/app/actions/therapist";

export function DeleteTherapistButton({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = deleteTherapistAction.bind(null, profileId);

  function confirmDelete() {
    formRef.current?.requestSubmit();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 underline hover:text-red-800"
      >
        Usuń
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="alertdialog"
            aria-labelledby="delete-therapist-title"
            aria-describedby="delete-therapist-desc"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-therapist-title"
              className="text-lg font-semibold text-[#003C79]"
            >
              Usunąć terapeutę?
            </h2>
            <p id="delete-therapist-desc" className="mt-2 text-sm text-slate-600">
              Czy na pewno chcesz usunąć profil{" "}
              <strong className="text-slate-800">{displayName}</strong>? Tej operacji nie
              można cofnąć.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Usuń terapeutę
              </button>
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} action={action} className="hidden" aria-hidden />
    </>
  );
}
