/**
 * @file Calculates the angle between the center of the Cabrera-circle and the mouse/touchpoint.
 */
(function (root) {
    const EcgApp = (root.EcgApp = root.EcgApp || {});

    const radToDeg = (rad) => rad * (180 / Math.PI);

    const getAngle = (domObject, clientPos) => {
        const rect = domObject.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let theta = radToDeg(Math.atan2(clientPos.y - centerY, clientPos.x - centerX));
        return theta >= 0 ? theta : 360 + theta;
    };

    const mouseAngle = (event, domObject) => {
        if (typeof event.clientX === 'number') {
            return getAngle(domObject, { x: event.clientX, y: event.clientY });
        }
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return 0;
        return getAngle(domObject, { x: touch.clientX, y: touch.clientY });
    };

    EcgApp.circleCalculations = { mouseAngle };
})(typeof globalThis !== 'undefined' ? globalThis : window);
