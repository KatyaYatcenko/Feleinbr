import React, { useEffect, useState } from 'react';

const loadingMessages = [
  'Передбачення: сьогодні хтось обов’язково напише першим. А якщо ні — можливо, саме час зробити перший крок',
  
  'Поки Feleinbr завантажує твої чати, система перевіряє збережені дані та готує все необхідне для продовження розмов',
  
  'Деякі розмови починаються зі звичайного «привіт», а закінчуються о третій годині ночі. Ми не засуджуємо',
  
  'Персонажі теж мають свої характери, звички та настрій. Саме тому одна й та сама фраза може отримати зовсім різну відповідь',
  
  'Feleinbr прокидається після короткого сну. Якщо завантаження трохи довше, ніж зазвичай, значить сервер теж вирішив поспати',
  
  'Цікаво, про що зараз думає твій персонаж? Насправді краще не питати. Деякі думки краще залишити загадкою',
  
  'Під час розмови не обов’язково знати, що сказати далі. Іноді найцікавіші діалоги починаються саме тоді, коли плану закінчилися',
  
  'Не кожна відповідь з’являється миттєво. Іноді кілька секунд очікування — це просто ціна за те, щоб думка встигла сформуватися',
  
  'Твої персонажі вже чекають. Хтось терпляче, хтось нетерпляче, а хтось, можливо, вже придумав, за що на тебе образитися',
  
  'Ще трохи — Feleinbr майже готовий. Можеш поки подумати, з якого повідомлення почнеться сьогоднішня розмова',
  
  'У кожного чату є своя історія. Навіть коротке повідомлення може стати початком розмови, яку ти не планувала продовжувати так довго',
  
  'Render сказав, що вже прокидається. Ми вирішили йому повірити',
  
  'Поки система завантажується, десь у цифровому просторі один сервер намагається згадати, навіщо його взагалі розбудили',
  
  'Іноді найкраща розмова — та, яку ти не планувала починати. Саме тому ніколи не знаєш, куди приведе наступне повідомлення',
  
  'Feleinbr перевіряє з’єднання, завантажує дані та переконується, що твої чати будуть там, де ти їх залишила',
  
  'Передбачення: наступне повідомлення може бути абсолютно звичайним. А може випадково започаткувати абсолютно неочікувану розмову',
  
  'Якщо ти бачиш цей текст трохи довше, ніж хотілося б — не хвилюйся. Сервер просто вирішив сьогодні прокинутися повільніше',
  
  'У Feleinbr немає правильного способу вести розмову. Можеш ставити запитання, жартувати, сперечатися або просто написати перше, що спало на думку',
  
  'Завантаження завершиться швидше, якщо не дивитися на смужку. На жаль, ми не можемо це довести',
  
  'Майже готово. Залишилося перевірити останні деталі — і можна повертатися до розмов',
];

export default function LoadingScreen({ isReady, onFinished }) {
  const [message, setMessage] = useState(() =>
    loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
  );

  const [progress, setProgress] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Повільно рухає прогрес, поки сервер ще не відповів
  useEffect(() => {
    if (isReady) {
      setProgress(100);
      return;
    }

    const timer = setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;

        if (current < 35) return current + 3;
        if (current < 65) return current + 2;
        if (current < 85) return current + 1;

        return current + 0.3;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isReady]);

  // Міняємо випадкову фразу
  useEffect(() => {
    if (isReady) return;

    const messageTimer = setInterval(() => {
      setMessage((current) => {
        const available = loadingMessages.filter(
          (item) => item !== current
        );

        return available[
          Math.floor(Math.random() * available.length)
        ];
      });
    }, 2500);

    return () => clearInterval(messageTimer);
  }, [isReady]);

  // Коли все завантажилось — даємо 100% побути на екрані
  // і потім плавно прибираємо loading
  useEffect(() => {
    if (!isReady) return;

    const finishTimer = setTimeout(() => {
      setIsFinishing(true);

      const removeTimer = setTimeout(() => {
        onFinished?.();
      }, 550);

      return () => clearTimeout(removeTimer);
    }, 450);

    return () => clearTimeout(finishTimer);
  }, [isReady, onFinished]);

  return (
    <div
      className={`loading-screen ${
        isFinishing ? 'loading-screen-hidden' : ''
      }`}
    >
      <div className="loading-content">
        <img
          src="/icon.jpg"
          alt="Feleinbr"
          className="loading-logo"
        />

        <div className="loading-title">
          Feleinbr
        </div>

        <div className="loading-progress">
          <div
            className="loading-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="loading-message">
          {isReady
            ? 'Все готово'
            : message}
        </div>
      </div>
    </div>
  );
}