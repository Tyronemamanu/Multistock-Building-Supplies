// Home page hero video: plays by itself in a silent loop, pauses while the hero is off
// screen, and stays on its first frame for visitors who ask for reduced motion.
(function () {
  var video = document.querySelector('.hero-scrub-video')
  if (!video) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.removeAttribute('autoplay')
    video.pause()
    return
  }
  if (!('IntersectionObserver' in window)) return

  new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      var p = video.play()
      if (p && p.catch) p.catch(function () {})
    } else {
      video.pause()
    }
  }).observe(video)
})()
