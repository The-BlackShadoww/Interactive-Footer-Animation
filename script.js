document.addEventListener("DOMContentLoaded", function () {
  // Use global GSAP, ScrollTrigger, Matter, Lenis (from CDN)
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  const animationOnScroll = true;
  const config = {
    gravity: { x: 0, y: 1 },
    restitution: 0.5,
    friction: 0.15,
    frictionAir: 0.02,
    density: 0.002,
    wallThickness: 200,
    mouseStiffness: 0.6,
  };

  let engine,
    runner,
    mouseConstraint,
    bodies = [],
    topWall = null;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function initPhysics(container) {
    engine = Matter.Engine.create();
    engine.gravity = config.gravity;

    const containerRect = container.getBoundingClientRect();
    const wallThickness = config.wallThickness;

    // Create walls
    const walls = [
      Matter.Bodies.rectangle(
        containerRect.width / 2,
        containerRect.height + wallThickness / 2,
        containerRect.width + wallThickness * 2,
        wallThickness,
        { isStatic: true }
      ),
      Matter.Bodies.rectangle(
        -wallThickness / 2,
        containerRect.height / 2,
        wallThickness,
        containerRect.height + wallThickness * 2,
        { isStatic: true }
      ),
      Matter.Bodies.rectangle(
        containerRect.width + wallThickness / 2,
        containerRect.height / 2,
        wallThickness,
        containerRect.height + wallThickness * 2,
        { isStatic: true }
      ),
    ];
    Matter.World.add(engine.world, walls);

    // Create bodies for objects
    const objects = container.querySelectorAll(".object");
    objects.forEach((obj, index) => {
      const objRect = obj.getBoundingClientRect();
      const startX =
        Math.random() * (containerRect.width - objRect.width) +
        objRect.width / 2;
      const startY = -500 - index * 200;
      const startRotation = (Math.random() - 0.5) * Math.PI;
      const body = Matter.Bodies.rectangle(
        startX,
        startY,
        objRect.width,
        objRect.height,
        {
          restitution: config.restitution,
          friction: config.friction,
          frictionAir: config.frictionAir,
          density: config.density,
        }
      );
      Matter.Body.setAngle(body, startRotation);
      bodies.push({
        body: body,
        element: obj,
        width: objRect.width,
        height: objRect.height,
      });
      Matter.World.add(engine.world, body);
    });

    setTimeout(() => {
      topWall = Matter.Bodies.rectangle(
        containerRect.width / 2,
        -wallThickness / 2,
        containerRect.width + wallThickness * 2,
        wallThickness,
        { isStatic: true }
      );
      Matter.World.add(engine.world, topWall);
    }, 3000);

    // Mouse constraint
    const mouse = Matter.Mouse.create(container);
    mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: config.mouseStiffness,
        render: { visible: false },
      },
    });
    Matter.World.add(engine.world, mouseConstraint);

    // Dragging boundaries
    let dragging = null,
      originalInertia = null;
    Matter.Events.on(mouseConstraint, "startdrag", (event) => {
      dragging = event.body;
      if (dragging) {
        originalInertia = dragging.inertia;
        Matter.Body.setInertia(dragging, Infinity);
        Matter.Body.setVelocity(dragging, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(dragging, 0);
      }
    });
    Matter.Events.on(mouseConstraint, "enddrag", (event) => {
      if (dragging) {
        Matter.Body.setInertia(dragging, originalInertia || 1);
        dragging = null;
        originalInertia = null;
      }
    });
    Matter.Events.on(engine, "beforeUpdate", () => {
      if (dragging) {
        const found = bodies.find((b) => b.body === dragging);
        if (found) {
          const minX = found.width / 2;
          const maxX = containerRect.width - found.width / 2;
          const minY = found.height / 2;
          const maxY = containerRect.height - found.height / 2;
          Matter.Body.setPosition(dragging, {
            x: clamp(dragging.position.x, minX, maxX),
            y: clamp(dragging.position.y, minY, maxY),
          });
          Matter.Body.setVelocity(dragging, {
            x: clamp(dragging.velocity.x, -20, 20),
            y: clamp(dragging.velocity.y, -20, 20),
          });
          Matter.Body.setAngularVelocity(dragging, 0);
        }
      }
    });

    // Runner
    runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // Position update loop
    function updatePositions() {
      bodies.forEach(({ body, element, width, height }) => {
        const x = clamp(
          body.position.x - width / 2,
          0,
          containerRect.width - width
        );
        const y = clamp(
          body.position.y - height / 2,
          -height * 3,
          containerRect.height - height
        );
        element.style.left = x + "px";
        element.style.top = y + "px";
        element.style.transform = `rotate(${body.angle}rad)`;
      });
      requestAnimationFrame(updatePositions);
    }
    updatePositions();
  }

  // Animation trigger
  if (animationOnScroll) {
    document.querySelectorAll("section").forEach((section) => {
      if (section.querySelector(".object-container")) {
        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          once: true,
          onEnter: () => {
            const container = section.querySelector(".object-container");
            if (container && !engine) {
              initPhysics(container);
            }
          },
        });
      }
    });
  } else {
    window.addEventListener("load", () => {
      const container = document.querySelector(".object-container");
      if (container) {
        initPhysics(container);
      }
    });
  }
});
