import React from 'react';

export const ComingSoon: React.FC<{ title?: string }> = ({ title }) => (
  <section className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <h2 className="text-2xl font-semibold mb-4 text-white">{title ?? 'Coming Soon'}</h2>
    <p className="text-gray-400 max-w-md">
      هذه الميزة غير متاحة بعد. الرجاء مراجعة الموقع لاحقًا.
    </p>
  </section>
);
