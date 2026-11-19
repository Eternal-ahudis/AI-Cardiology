/**
 * @file Includes the necessary texts to switch between languages (Ru, En, De, Es).
 */
(function (root) {
    const EcgApp = (root.EcgApp = root.EcgApp || {});

    const langRu = {
        code: 'ru',
        title: 'Тренажёр ЭКГ и ЭОС',
        navCabrera: 'ЭОС',
        navPathologies: 'Патологии',
        navQuiz: 'Тест',
        navAbout: 'О проекте',
        quizCorrect: 'Верно',
        quizWrong: 'Неверно',
        rhythmLabel: 'II (ритм)',
        typeRuNormal: 'Нормальная ЭОС',
        typeRuHorizontal: 'Горизонтальная ЭОС',
        typeRuVertical: 'Вертикальная ЭОС',
        typeRuLad: 'Отклонение ЭОС влево',
        typeRuRad: 'Отклонение ЭОС вправо',
        typeRuNw: 'Резкое отклонение (северо-западная)',
        typeNormal: 'Нормальная ЭОС',
        typeLad: 'Отклонение влево',
        typeRad: 'Отклонение вправо',
        typeNw: 'Северо-западная',
        aboutGeneral: '<p>Автор проекта: <strong>Ян Ситдиков (Yan Sitdikov / Sitdikov Yan)</strong>.</p><p>Интерактивный тренажёр по электрокардиографии для изучения определения электрической оси сердца (ЭОС), нарушений ритма и проводимости, гипертрофий отделов сердца и коронарной недостаточности.</p><p>Раздел «Патологии», 12-пунктный план анализа ЭКГ, диагностический алгоритм и тестовые задания реализованы по учебно-методическому пособию «Электрокардиография в курсе пропедевтики внутренних болезней» (И.И. Шапошник, В.В. Генкель, Е.В. Лебедев и др.).</p>',
        aboutSources: '<h2>Источники и ссылки</h2><p>1. Шапошник И.И., Генкель В.В., Лебедев Е.В. и др. «Электрокардиография в курсе пропедевтики внутренних болезней» — учебно-методическое пособие, 2020.</p><p>2. Справочник MSD Профессиональная версия: «Перикардит» (Brian D. Hoit, MD; Jonathan G. Howlett, MD, 2026).</p><p>3. Репозиторий проекта и релизы: <a href="https://github.com/Eternal-ahudis/AI-Cardiology" target="_blank" rel="noopener noreferrer">github.com/Eternal-ahudis/AI-Cardiology</a> (<a href="https://github.com/Eternal-ahudis/AI-Cardiology/releases/tag/AI-slop" target="_blank" rel="noopener noreferrer">Release AI-slop</a>).</p>'
    };

    const langDe = {
        code: 'de',
        title: 'Lagetyptrainer',
        navCabrera: 'Cabrera',
        navPathologies: 'Pathologien',
        navQuiz: 'Quiz',
        navAbout: 'Info',
        quizCorrect: 'Richtig',
        quizWrong: 'Falsch',
        rhythmLabel: 'II (Rhythmus)',
        typeRuNormal: 'Нормальная ЭОС',
        typeRuHorizontal: 'Горизонтальная ЭОС',
        typeRuVertical: 'Вертикальная ЭОС',
        typeRuLad: 'Отклонение ЭОС влево',
        typeRuRad: 'Отклонение ЭОС вправо',
        typeRuNw: 'Резкое отклонение',
        aboutGeneral: '<p>Autor: <strong>Yan Sitdikov (Sitdikov Yan)</strong>.</p><p>Interaktiver EKG-Trainer zum Erlernen der Bestimmung der elektrischen Herzachse (Lagetyp), von Herzrhythmus- und Erregungsleitungsstörungen, Hypertrophien sowie koronarer Insuffizienz im 12-Kanal-EKG.</p><p>Der Quellcode und die Releases sind auf GitHub verfügbar: <a href="https://github.com/Eternal-ahudis/AI-Cardiology" target="_blank" rel="noopener noreferrer">AI-Cardiology</a> (<a href="https://github.com/Eternal-ahudis/AI-Cardiology/releases/tag/AI-slop" target="_blank" rel="noopener noreferrer">Release AI-slop</a>).</p>',
        aboutSources: '<h2>Quellen</h2><p>1. Lehrbuch «Электрокардиография в курсе пропедевтики внутренних болезней» (I.I. Schaposchnik et al., 2020).</p><p>2. MSD Manual Profi-Ausgabe: «Perikarditis» (Brian D. Hoit, Jonathan G. Howlett, 2026).</p><p>3. Farbschema des Cabrerakreises inspiriert durch:<br><a href="https://commons.wikimedia.org/wiki/File:Cabrera_circle_-_german.svg" target="_blank" rel="noopener noreferrer">Illustration des Cabrerakreises mit den Ableitungen nach Einthoven und Goldberger und den Lagetypen.</a><br>Wikipedia.org, 19.11.2007.</p>'
    };

    const langEn = {
        code: 'en',
        title: 'Cardiac axis trainer',
        navCabrera: 'Axis',
        navPathologies: 'Pathologies',
        navQuiz: 'Quiz',
        navAbout: 'About',
        quizCorrect: 'Correct',
        quizWrong: 'Wrong',
        rhythmLabel: 'II (rhythm)',
        typeRad: 'Right axis deviation',
        typeLad: 'Left axis deviation',
        typeNormal: 'Normal QRS axis',
        typeNw: 'Northwest axis',
        typeRuNormal: 'Normal axis',
        typeRuHorizontal: 'Horizontal axis',
        typeRuVertical: 'Vertical axis',
        typeRuLad: 'Left axis deviation',
        typeRuRad: 'Right axis deviation',
        typeRuNw: 'Northwest axis',
        aboutGeneral: '<p>Author: <strong>Yan Sitdikov (Sitdikov Yan)</strong>.</p><p>Interactive ECG trainer for learning cardiac QRS axis interpretation, arrhythmias, conduction blocks, chamber hypertrophy, and myocardial ischemia/infarction on 12-lead ECG.</p><p>Source code and releases are available on GitHub: <a href="https://github.com/Eternal-ahudis/AI-Cardiology" target="_blank" rel="noopener noreferrer">github.com/Eternal-ahudis/AI-Cardiology</a> (<a href="https://github.com/Eternal-ahudis/AI-Cardiology/releases/tag/AI-slop" target="_blank" rel="noopener noreferrer">Release AI-slop</a>).</p>',
        aboutSources: '<h2>Sources</h2><p>1. Educational textbook on electrocardiography in internal medicine propaedeutics (I.I. Shaposhnik et al., 2020).</p><p>2. MSD Manual Professional Version: «Pericarditis» (Brian D. Hoit, Jonathan G. Howlett, 2026).</p><p>3. Reference article: <a href="https://litfl.com/ecg-axis-interpretation/" target="_blank" rel="noopener noreferrer">Life in the Fastlane — ECG Axis Interpretation</a>.</p><p>4. Cabrera circle color palette inspired by <a href="https://commons.wikimedia.org/wiki/File:Cabrera_circle_-_german.svg" target="_blank" rel="noopener noreferrer">Wikimedia Commons Cabrera circle</a>.</p>'
    };

    const langEs = {
        code: 'es',
        title: 'Eje Cardíaco',
        navCabrera: 'Eje',
        navPathologies: 'Patologías',
        navQuiz: 'Examen',
        navAbout: 'Sobre',
        quizCorrect: 'Correcto',
        quizWrong: 'Incorrecto',
        rhythmLabel: 'II (ritmo)',
        typeRad: 'Eje derecho',
        typeLad: 'Eje Izquierdo',
        typeNormal: 'Normal',
        typeNw: 'Extremo',
        typeRuNormal: 'Normal',
        typeRuHorizontal: 'Horizontal',
        typeRuVertical: 'Vertical',
        typeRuLad: 'Eje izquierdo',
        typeRuRad: 'Eje derecho',
        typeRuNw: 'Extremo',
        aboutGeneral: '<p>Autor: <strong>Yan Sitdikov (Sitdikov Yan)</strong>.</p><p>Entrenador interactivo de ECG para aprender a interpretar el eje eléctrico cardíaco, arritmias, bloqueos de conducción, hipertrofias e isquemia/infarto en ECG de 12 derivaciones.</p><p>El código fuente y los lanzamientos están disponibles en GitHub: <a href="https://github.com/Eternal-ahudis/AI-Cardiology" target="_blank" rel="noopener noreferrer">github.com/Eternal-ahudis/AI-Cardiology</a> (<a href="https://github.com/Eternal-ahudis/AI-Cardiology/releases/tag/AI-slop" target="_blank" rel="noopener noreferrer">Release AI-slop</a>).</p>',
        aboutSources: '<h2>Sources</h2><p>1. Manual docente de electrocardiografía en propedéutica clínica (I.I. Shaposhnik et al., 2020).</p><p>2. Manual MSD Versión para profesionales: «Pericarditis» (Brian D. Hoit, Jonathan G. Howlett, 2026).</p><p>3. Artículo de referencia: <a href="https://litfl.com/ecg-axis-interpretation/" target="_blank" rel="noopener noreferrer">Life in the Fastlane — ECG Axis Interpretation</a>.</p><p>4. Paleta de colores del círculo de Cabrera inspirada en <a href="https://commons.wikimedia.org/wiki/File:Cabrera_circle_-_german.svg" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>.</p>'
    };

    EcgApp.languages = { langRu, langDe, langEn, langEs };
})(typeof globalThis !== 'undefined' ? globalThis : window);
