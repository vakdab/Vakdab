function handoffToSenPlayer(source) {
  if (!shouldAutoLaunchSenPlayer(source)) return false;
  try {
    window.location.assign(buildSenPlayerUrl(source));
    return true;
  } catch (error) {
    console.warn("[SenPlayer] Could not open resolved video:", error);
    showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 SenPlayer \u2014 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0454\u043C\u043E \u0432\u0431\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0439 \u043F\u043B\u0435\u0454\u0440");
    return false;
  }
}
function renderPlayerUnreleasedNotice(message, retryUrl) {
  const grid = document.getElementById("episodeViewGrid");
  if (!grid) return;
  const title = message || "\u0410\u043D\u0456\u043C\u0435 \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u0432 \u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0456\u0439 \u043E\u0437\u0432\u0443\u0447\u0446\u0456";
  grid.innerHTML = `<div class="player-unreleased-state" role="status">
                <div class="player-unreleased-icon" aria-hidden="true">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="player-unreleased-body">
                    <h4 class="player-unreleased-title">${escapeHtml2(title)}</h4>
                    <p class="player-unreleased-desc">\u0421\u0435\u0440\u0456\u0457 \u0430\u0431\u043E \u0440\u0435\u043B\u0456\u0437 \u0434\u043B\u044F \u0446\u044C\u043E\u0433\u043E \u0442\u0430\u0439\u0442\u043B\u0443 \u0449\u0435 \u0433\u043E\u0442\u0443\u044E\u0442\u044C\u0441\u044F. \u0417\u0431\u0435\u0440\u0435\u0436\u0456\u0442\u044C \u0443 \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0438, \u0449\u043E\u0431 \u043D\u0435 \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0438 \u043F\u043E\u044F\u0432\u0443 \u043D\u043E\u0432\u0438\u0445 \u0435\u043F\u0456\u0437\u043E\u0434\u0456\u0432!</p>
                </div>
                <button class="player-retry-btn" type="button"><i class="fas fa-sync-alt"></i> \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0438\u0442\u0438 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044F</button>
            </div>`;
  const retry = grid.querySelector(".player-retry-btn");
  retry?.addEventListener("click", () => {
    retry.disabled = true;
    retry.innerHTML = '<i class="fas fa-spinner fa-spin"></i> \u041E\u043D\u043E\u0432\u043B\u044E\u0454\u043C\u043E...';
    openPlayerPage2(retryUrl || playerPageCurrentAnimeUrl);
  });
}
function renderPlayerEpisodeError(message, diagnostics, retryUrl) {
  const grid = document.getElementById("episodeViewGrid");
  if (!grid) return;
  const device = diagnostics?.device?.type || detectDeviceInfo(navigator.userAgent).type;
  const stage = diagnostics?.failedStage || "\u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0434\u0430\u043D\u0438\u0445 \u043F\u043B\u0435\u0454\u0440\u0430";
  const detail = diagnostics?.emptyObject ? `\u041D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E: ${diagnostics.emptyObject}` : stage;
  grid.innerHTML = `<div class="episode-empty player-error-state" role="alert">
                <div class="player-error-icon" aria-hidden="true">
                    <i class="fas fa-circle-exclamation"></i>
                </div>
                <div class="player-error-body">
                    <h4 class="player-error-title">${escapeHtml2(message || "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0434\u0430\u043D\u0438\u0445 \u043F\u043B\u0435\u0454\u0440\u0430")}</h4>
                    <p class="player-error-desc">\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u0435\u0440\u0456\u0439. \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0437'\u0454\u0434\u043D\u0430\u043D\u043D\u044F \u0430\u0431\u043E \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0456\u0437\u043D\u0456\u0448\u0435.</p>
                    ${detail ? `<div class="player-error-meta"><small>\u0414\u0456\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430: ${escapeHtml2(detail)} (${escapeHtml2(device)})</small></div>` : ""}
                </div>
                <button class="player-retry-btn" type="button"><i class="fas fa-redo"></i> \u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435 \u0440\u0430\u0437</button>
            </div>`;
  const retry = grid.querySelector(".player-retry-btn");
  retry?.addEventListener("click", () => {
    retry.disabled = true;
    retry.innerHTML = '<i class="fas fa-spinner fa-spin"></i> \u041F\u043E\u0432\u0442\u043E\u0440\u044E\u0454\u043C\u043E...';
    openPlayerPage2(retryUrl || playerPageCurrentAnimeUrl);
  });
}
async function openPlayerPage2(url, options = {}) {
  loadFeature("player").catch((error) => console.warn("[VakDab] player feature preload:", error));
  const modal = document.getElementById("playerPageModal");
  if (!modal) return;
  if (!playerPageIsOpen) {
    playerPagePreviousBodyOverflow = document.body.style.overflow || "";
    playerPagePreviousActiveElement = document.activeElement;
  }
  playerPageIsOpen = true;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  modal.setAttribute("aria-busy", "true");
  document.documentElement.classList.add("player-page-open");
  document.body.classList.add("player-page-open");
  document.getElementById("bottomNav")?.classList.add("hidden-nav");
  if (_playerLoadController) {
    _playerLoadController.abort();
    _playerLoadController = null;
  }
  _playerLoadController = new AbortController();
  const _thisSignal = _playerLoadController.signal;
  if (playerPagePlayer) {
    playerPagePlayer.destroy();
    playerPagePlayer = null;
  }
  playerPageAnime = null;
  playerPageCurrentEpisodeNum = "1";
  playerPagePlaybackRequest += 1;
  playerJikanData = null;
  playerCharacterItems = [];
  playerCharacterExpanded = false;
  playerRelatedItems = [];
  playerRelatedExpanded = false;
  playerMediaItems = [];
  playerMediaExpanded = false;
  if (playerCountdownTimer) {
    clearInterval(playerCountdownTimer);
    playerCountdownTimer = null;
  }
  const infoGridReset = document.getElementById("animeInfoGrid");
  if (infoGridReset) infoGridReset.innerHTML = renderPlayerInfoSkeleton();
  const countdownReset = document.getElementById("animeCountdown");
  if (countdownReset) countdownReset.textContent = "";
  setSectionState("relatedSection", false);
  setSectionState("mediaSection", false);
  setSectionState("mainCharactersSection", false);
  const mainCharactersMoreReset = document.getElementById("mainCharactersMoreBtn");
  if (mainCharactersMoreReset) mainCharactersMoreReset.hidden = true;
  playerPageCurrentAnimeUrl = url;
  playerPageHistoryUpdated = false;
  playerPageWatchStartTime = 0;
  playerPageAccumulatedWatchSeconds = 0;
  playerPageWatchTimeSynced = 0;
  playerPageLastProgressSave = 0;
  playerPageLastVideoTime = null;
  playerPageIsPlaying = false;
  const playerVideoContainer = document.getElementById("playerVideoContainer");
  playerVideoContainer.classList.add("active");
  playerVideoContainer.classList.add("has-played");
  playerVideoContainer.classList.remove("is-preview");
  const posterTargets = [document.getElementById("playerPosterImg"), document.getElementById("playerHeroPoster")];
  posterTargets.forEach((img) => {
    if (img) {
      img.src = "";
      img.alt = "";
    }
  });
  const playerHero = document.getElementById("playerBlurBg");
  playerHero.classList.add("is-loading");
  playerHero.style.backgroundImage = "";
  document.getElementById("playerPageVideo").innerHTML = "";
  document.getElementById("episodeViewGrid").innerHTML = "";
  document.getElementById("episodeViewCompact").innerHTML = "";
  document.getElementById("episodeViewClassic").innerHTML = "";
  document.getElementById("episodePanel").classList.remove("visible");
  document.getElementById("page-episodes").classList.remove("active");
  document.getElementById("page-info").classList.add("active");
  const synopsisEl = document.getElementById("playerSynopsis");
  if (synopsisEl) {
    synopsisEl.textContent = "";
    synopsisEl.classList.remove("expanded");
  }
  const moreBtn = document.getElementById("synopsisMoreBtn");
  if (moreBtn) {
    moreBtn.style.display = "none";
    moreBtn.classList.remove("is-expanded");
    moreBtn.textContent = "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0438 \u043F\u043E\u0432\u043D\u0456\u0441\u0442\u044E";
  }
  document.getElementById("playerTopbarTitle").textContent = "";
  document.getElementById("playerVideoEpisodeOverlay")?.replaceChildren();
  document.getElementById("playerVideoSeasonOverlay")?.replaceChildren();
  document.getElementById("playerKicker").style.display = "";
  const _resetLogoImg = document.getElementById("playerTitleLogo");
  if (_resetLogoImg) {
    _resetLogoImg.style.display = "none";
    _resetLogoImg.src = "";
  }
  document.getElementById("castSection").style.display = "none";
  document.getElementById("castList").innerHTML = "";
  const resetCastTitle = document.querySelector("#castSection .section-title");
  if (resetCastTitle) resetCastTitle.textContent = "\u0410\u043A\u0442\u043E\u0440\u0438";
  document.getElementById("mainCharactersList").innerHTML = "";
  document.getElementById("mainCharactersMoreBtn").hidden = true;
  const _resetRelatedSection = document.getElementById("relatedSeasonsSection");
  if (_resetRelatedSection) _resetRelatedSection.style.display = "none";
  closePlayerTeamDropdown();
  updateLikeButton();
  updateDislikeButton();
  updateBookmarkButton(url);
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal-content").scrollTop = 0;
  modal.focus({ preventScroll: true });
  try {
    const anime = await loadHikkaDetail2(url);
    if (_thisSignal.aborted || modal.style.display === "none") return;
    playerPageAnime = anime;
    playerPageAnimeuaSeasons = {};
    externalSourceCache = {};
    playerPageSources = anime.mikaiAvailable ? anime.animeOnUrl ? ["ASHDI", "AnimeON"] : ["ASHDI"] : anime.animeOnUrl ? ["AnimeON"] : [];
    playerPageCurrentSource = playerPageSources[0] || "ASHDI";
    const hikkaPosterUrl = normalizePosterUrl2(anime.images?.jpg?.large_image_url);
    const mikaiPosterUrl = normalizePosterUrl2(anime.mikaiPosterUrl || "", "");
    const posterUrl = mikaiPosterUrl || hikkaPosterUrl;
    const initialPoster = anime.bannerUrl || anime.backdropUrl || anime.headerImage || posterUrl;
    if (initialPoster) {
      setPlayerFramePoster(initialPoster);
    } else {
      hidePlayerFramePoster();
    }
    updatePlayerVideoFrame(anime, playerPageCurrentEpisodeNum);
    const heroPoster = document.getElementById("playerHeroPoster");
    const revealPlayerHero = () => playerHero.classList.remove("is-loading");
    const posterTargets2 = [document.getElementById("playerPosterImg"), heroPoster];
    posterTargets2.forEach((img) => {
      if (!img) return;
      img.onerror = () => {
        if (img.src !== hikkaPosterUrl && hikkaPosterUrl) {
          img.src = hikkaPosterUrl;
        } else {
          revealPlayerHero();
        }
      };
      if (img === heroPoster) img.onload = revealPlayerHero;
      img.src = posterUrl;
      if (img.id === "playerHeroPoster") img.alt = anime.title || "";
    });
    if (heroPoster?.complete && heroPoster.naturalWidth > 0) revealPlayerHero();
    document.getElementById("playerPosterTitle").textContent = anime.title;
    const kickerEl = document.getElementById("playerKicker");
    if (kickerEl) {
      kickerEl.textContent = anime.title;
      kickerEl.style.display = mikaiPosterUrl ? "none" : "";
    }
    document.getElementById("playerTopbarTitle").textContent = anime.title;
    document.getElementById("playerBlurBg").style.backgroundImage = `url(${posterUrl})`;
    const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2, e) => Math.max(s2, e.length), 0), 0);
    const rawAnimeScore = String(anime.score ?? "").replace(",", ".").trim();
    const normalizedAnimeScore = Number.parseFloat(rawAnimeScore);
    document.getElementById("playerAgeBadge").textContent = Number.isFinite(normalizedAnimeScore) ? normalizedAnimeScore.toFixed(1) : "\u2014";
    const isMovie = playerAnimeIsMovie(anime);
    document.getElementById("playerStatusTag").textContent = isMovie ? "\u0424\u0456\u043B\u044C\u043C" : totalEpisodes > 0 ? "\u041E\u043D\u0433\u043E\u0457\u043D\u0433" : "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E";
    const animeRuntime = formatMovieRuntime(anime.runtimeMinutes);
    document.getElementById("playerMetaLine").textContent = isMovie ? `${anime.year || "\u2014"}, \u0424\u0456\u043B\u044C\u043C${animeRuntime ? ` \xB7 ${animeRuntime}` : ""}` : `${anime.year || "\u2014"}, ${totalEpisodes} \u0435\u043F.`;
    document.getElementById("playerTagRow").innerHTML = normalizeGenreList3(anime.genres).slice(0, 4).map((g) => `<span class="tag">${escapeHtml2(g)}</span>`).join("");
    document.getElementById("playerEpisodeCountNum").textContent = totalEpisodes;
    const synopsisEl2 = document.getElementById("playerSynopsis");
    if (synopsisEl2) {
      synopsisEl2.textContent = cleanPlayerSynopsis(anime.synopsis) || "\u041E\u043F\u0438\u0441 \u0432\u0456\u0434\u0441\u0443\u0442\u043D\u0456\u0439.";
      synopsisEl2.classList.remove("expanded");
      const moreBtn2 = document.getElementById("synopsisMoreBtn");
      setTimeout(() => {
        if (moreBtn2 && synopsisEl2.scrollHeight > synopsisEl2.clientHeight + 2) {
          moreBtn2.style.display = "inline-flex";
        }
      }, 100);
      if (moreBtn2) {
        moreBtn2.onclick = () => {
          synopsisEl2.classList.toggle("expanded");
          const expanded = synopsisEl2.classList.contains("expanded");
          moreBtn2.classList.toggle("is-expanded", expanded);
          moreBtn2.textContent = expanded ? "\u0417\u0433\u043E\u0440\u043D\u0443\u0442\u0438" : "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0438 \u043F\u043E\u0432\u043D\u0456\u0441\u0442\u044E";
        };
      }
    }
    updateSourceChip();
    loadAnimeRatingAggregate(url);
    const seasons = Object.keys(anime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
    playerPageCurrentSeason = seasons[0] || "1";
    const liveSeasonData = anime.seasons?.[playerPageCurrentSeason] || {};
    const requestedLiveDub = String(options.liveDub || "").trim();
    playerPageCurrentDub = requestedLiveDub && liveSeasonData[requestedLiveDub] ? requestedLiveDub : pickPreferredDub2(liveSeasonData);
    const liveEpisodes = liveSeasonData[playerPageCurrentDub] || [];
    const requestedLiveEpisode = String(options.liveEpisode || "").trim();
    playerPageCurrentEpisodeNum = liveEpisodes.some((ep) => String(ep.episode) === requestedLiveEpisode) ? requestedLiveEpisode : "1";
    playerPageCurrentQuality = "1080p";
    buildSeasonRow(seasons);
    buildEpisodeViews();
    updateFilterChip();
    updatePlayFabLabel();
    document.getElementById("episodePanel").classList.add("visible");
    if (seasons.length === 0 || Object.keys(anime.seasons || {}).length === 0) {
      renderPlayerUnreleasedNotice("\u0410\u043D\u0456\u043C\u0435 \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u0432 \u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0456\u0439 \u043E\u0437\u0432\u0443\u0447\u0446\u0456", anime.url);
      console.warn("No episodes found for anime:", anime.url, anime._diagnostics);
    }
    buildBottomSheetData();
    modal.setAttribute("aria-busy", "false");
    if (window.lucide) lucide.createIcons();
    const currentEpisodes = getCurrentEpisodes();
    if (currentEpisodes.length > 0) {
      const cw = findContinueWatching(anime);
      let targetEp = null;
      if (cw && cw.progress < 95 && sameEpisodeValue(cw.season, playerPageCurrentSeason) && cw.dub === playerPageCurrentDub) {
        targetEp = currentEpisodes.find((ep) => sameEpisodeValue(ep.episode, cw.episode) && ep.file);
      }
      if (!targetEp) {
        targetEp = currentEpisodes.find((ep) => sameEpisodeValue(ep.episode, playerPageCurrentEpisodeNum) && ep.file) || currentEpisodes.find((ep) => ep.file) || currentEpisodes[0];
      }
      if (targetEp) {
        playerPageCurrentEpisodeNum = targetEp.episode;
        setAccordionSummary("playerEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${playerPageCurrentEpisodeNum}`);
        setAccordionSummary("playerCompactEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${playerPageCurrentEpisodeNum}`);
        renderAllEpisodeViews(currentEpisodes);
        if (targetEp.file) {
          playEpisode(targetEp.file, targetEp.episode, { autoplay: false });
        }
      }
    }
    loadAndRenderJikanExtras(anime);
  } catch (err) {
    if (_thisSignal.aborted || modal.style.display === "none") return;
    if (_thisSignal.aborted || err && (err.name === "AbortError" || err._playerAborted || err.message && (err.message.includes("aborted") || err.message.includes("Fetch is aborted")))) return;
    const isNotFound = err.message && (err.message.includes("\u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E") || err.message.includes("404"));
    const isTimeout = err.message && err.message.includes("\u043E\u0447\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F");
    const isNetwork = err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.message.includes("502") || err.message.includes("503") || err.message.includes("aborted") || err.message.includes("Fetch is aborted"));
    let userMsg, icon;
    if (isNotFound) {
      icon = "fa-search";
      userMsg = "\u0410\u043D\u0456\u043C\u0435 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043D\u0430 \u0434\u0436\u0435\u0440\u0435\u043B\u0456";
      const synEl = document.getElementById("playerSynopsis");
      if (synEl) synEl.textContent = "\u0426\u0435 \u0430\u043D\u0456\u043C\u0435 \u043F\u043E\u043A\u0438 \u0449\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0435.";
    } else if (isTimeout) {
      icon = "fa-clock";
      userMsg = "\u0427\u0430\u0441 \u043E\u0447\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F \u0432\u0438\u0447\u0435\u0440\u043F\u0430\u043D\u043E. \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0437'\u0454\u0434\u043D\u0430\u043D\u043D\u044F \u0456 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.";
      const synEl = document.getElementById("playerSynopsis");
      if (synEl) synEl.textContent = userMsg;
    } else if (isNetwork) {
      icon = "fa-wifi";
      userMsg = "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043C\u0435\u0440\u0435\u0436\u0456 \u0430\u0431\u043E \u0441\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0456\u0437\u043D\u0456\u0448\u0435.";
      const synEl = document.getElementById("playerSynopsis");
      if (synEl) synEl.textContent = userMsg;
    } else {
      icon = "fa-exclamation-circle";
      userMsg = "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0456\u0437\u043D\u0456\u0448\u0435.";
      const synEl = document.getElementById("playerSynopsis");
      if (synEl) synEl.textContent = userMsg;
    }
    modal.setAttribute("aria-busy", "false");
    const diagForErr = err._diagnostics || {
      url,
      ua: navigator.userAgent,
      device: detectDeviceInfo(navigator.userAgent),
      httpStatus: null,
      contentType: null,
      cfCacheStatus: null,
      cfRay: null,
      usedCloudflareWorker: true,
      corsError: isNetwork,
      htmlLoaded: false,
      htmlSize: 0,
      iframeCount: 0,
      iframeUrls: [],
      foundAshdi: false,
      foundVidmoly: false,
      foundPlayerjs: false,
      foundDataSrc: false,
      foundDataFile: false,
      foundVideoTag: false,
      foundSourceTag: false,
      playerUrlsCount: 0,
      seasonsCount: 0,
      episodesCount: 0,
      extractPlayerIframeUrlsRan: false,
      extractSourcesFromTextRan: false,
      foundM3u8: false,
      foundMp4: false,
      foundPlayerjsJson: false,
      foundBase64Playerjs: false,
      jsErrors: [err.stack || err.message || String(err)],
      failedStage: "openPlayerPage() \u2014 \u043D\u0435\u043E\u0431\u0440\u043E\u0431\u043B\u0435\u043D\u0430 \u043F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F",
      emptyObject: null
    };
    if (options.fromDeepLink) {
      closePlayerPage();
      Router.goTo("main");
      setTimeout(() => showToast("\u0410\u043D\u0456\u043C\u0435 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E"), 0);
      return;
    }
    renderPlayerEpisodeError(userMsg, diagForErr, url);
    document.getElementById("episodePanel").classList.add("visible");
    console.error("Player load error:", err.message || err, diagForErr);
  }
}
function buildShareUrl(animeUrl) {
  const base = new URL("./", window.location.href);
  base.hash = `anime?url=${encodeURIComponent(animeUrl || "")}`;
  return base.href;
}
function shareAnime() {
  const anime = playerPageAnime;
  const url = buildShareUrl(playerPageCurrentAnimeUrl) || window.location.href;
  const title = anime?.title || "VAKDAB";
  if (navigator.share) {
    navigator.share({ title, text: `\u0414\u0438\u0432\u0438\u0441\u044C \xAB${title}\xBB \u0443 VAKDAB \u2728`, url }).catch(() => {
    });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast("\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0441\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E")).catch(() => showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0441\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F"));
  } else {
    showToast("\u041F\u043E\u0434\u0456\u043B\u0438\u0442\u0438\u0441\u044F \u043D\u0435 \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u0443\u0454\u0442\u044C\u0441\u044F \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457");
  }
}
function normalizeEpisodeValue(value, fallback = "") {
  if (value === null || value === void 0 || value === "") return fallback;
  const text = String(value).trim();
  const numeric = Number(text);
  return Number.isFinite(numeric) ? String(numeric) : text;
}
function sameEpisodeValue(left, right) {
  return normalizeEpisodeValue(left) === normalizeEpisodeValue(right);
}
function findContinueWatching(anime) {
  if (!anime || !anime.seasons) return null;
  const history2 = Storage.getHistory();
  const entry = history2.find((h) => h.url === anime.url);
  if (!entry) return null;
  const season = normalizeEpisodeValue(entry.season, "1");
  const dubs = Object.keys(anime.seasons[season] || {});
  for (const dub of dubs) {
    const eps = anime.seasons[season][dub] || [];
    const ep = eps.find((e) => sameEpisodeValue(e.episode, entry.episode));
    if (ep) return { season, dub, ep, progress: entry.progress || 0 };
  }
  return null;
}
function updatePlayFabLabel() {
  const label = document.getElementById("playerPlayFabLabel");
  if (!label || !playerPageAnime) return;
  const cw = findContinueWatching(playerPageAnime);
  label.textContent = cw && cw.progress < 95 ? "\u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438" : "\u0414\u0438\u0432\u0438\u0442\u0438\u0441\u044C";
}
function updateSourceChip() {
  const label = document.getElementById("playerSourceLabel");
  if (label) label.textContent = playerPageCurrentSource || "\u0414\u0436\u0435\u0440\u0435\u043B\u043E \u0432\u0456\u0434\u0435\u043E";
  const watchSourceValue = document.getElementById("watchSourceValue");
  if (watchSourceValue) watchSourceValue.textContent = `${playerPageCurrentSource || "\u0414\u0436\u0435\u0440\u0435\u043B\u043E \u0432\u0456\u0434\u0435\u043E"} \xB7 ${playerPageCurrentQuality || ""}`;
}
function setAccordionSummary(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function selectDubFromSheet(dub, swipeDirection = 0) {
  if (!dub) return;
  const teamCard = document.getElementById("playerTeamSelectorTrigger");
  if (swipeDirection && teamCard) {
    if (teamCard.classList.contains("is-team-swipe-transitioning")) return;
    teamCard.classList.remove("team-swipe-enter-left", "team-swipe-enter-right");
    teamCard.classList.add("is-team-swipe-transitioning", swipeDirection < 0 ? "team-swipe-exit-left" : "team-swipe-exit-right");
    window.setTimeout(() => selectDubFromSheet(dub, 0), 170);
    return;
  }
  playerPageCurrentDub = dub;
  const episodes = getCurrentEpisodes();
  const matchingEp = episodes.find((ep) => sameEpisodeValue(ep.episode, playerPageCurrentEpisodeNum));
  if (matchingEp) {
    playerPageCurrentEpisodeNum = matchingEp.episode;
  } else if (episodes.length) {
    playerPageCurrentEpisodeNum = episodes[0].episode;
  }
  buildEpisodeViews();
  updateTeamCard();
  if (teamCard?.classList.contains("is-team-swipe-transitioning")) {
    const enteringClass = teamCard.classList.contains("team-swipe-exit-left") ? "team-swipe-enter-right" : "team-swipe-enter-left";
    teamCard.classList.remove("team-swipe-exit-left", "team-swipe-exit-right");
    teamCard.classList.add(enteringClass);
    window.setTimeout(() => teamCard.classList.remove("is-team-swipe-transitioning", enteringClass), 430);
  }
  updateFilterChip();
  buildBottomSheetData();
  showToast(`\u041E\u0437\u0432\u0443\u0447\u043A\u0430: ${dub}`);
  const currentEp = episodes.find((ep) => sameEpisodeValue(ep.episode, playerPageCurrentEpisodeNum)) || episodes[0];
  if (currentEp && currentEp.file) {
    playEpisode(currentEp.file, currentEp.episode);
  }
}
function selectSeasonFromSheet(season) {
  if (!season) return;
  playerPageCurrentSeason = season;
  const dubs = Object.keys(playerPageAnime?.seasons?.[season] || {}).sort();
  playerPageCurrentDub = dubs.includes(playerPageCurrentDub) ? playerPageCurrentDub : dubs[0] || "";
  const episodes = getCurrentEpisodes();
  playerPageCurrentEpisodeNum = episodes[0]?.episode || "1";
  buildEpisodeViews();
  refreshPlayerSeasonPoster(season);
  updateFilterChip();
  buildBottomSheetData();
  showToast(`\u0421\u0435\u0437\u043E\u043D ${season}`);
  const currentEp = episodes.find((ep) => sameEpisodeValue(ep.episode, playerPageCurrentEpisodeNum)) || episodes[0];
  if (currentEp && currentEp.file) {
    playEpisode(currentEp.file, currentEp.episode);
  }
}
function selectQualityFromSheet(quality) {
  playerPageCurrentQuality = quality;
  if (playerPagePlayer && typeof playerPagePlayer.setQuality === "function") {
    playerPagePlayer.setQuality(quality);
  }
  buildBottomSheetData();
  showToast(`\u042F\u043A\u0456\u0441\u0442\u044C: ${quality}`);
}
function formatDubDisplayName(rawName, isSub) {
  if (!rawName) return "";
  let name = String(rawName).trim();
  name = name.replace(/^(субтитри|субтитрами|суб|subs?|subtitles?)[\s:–—\-_]+/i, "");
  name = name.replace(/[\s:–—\-_]+(субтитри|субтитрами|суб|subs?|subtitles?)$/i, "");
  name = name.replace(/\s*\((субтитри|субтитрами|суб|subs?|subtitles?)\)\s*/gi, " ");
  name = name.replace(/\s*\[(субтитри|субтитрами|суб|subs?|subtitles?)\]\s*/gi, " ");
  name = name.trim();
  return name || (isSub ? "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u0438" : rawName);
}
function updateTeamCard() {
  const teamNameEl = document.getElementById("playerTeamName");
  const teamEpBadge = document.getElementById("playerTeamEpBadge");
  const teamTypeBadge = document.getElementById("playerTeamTypeBadge");
  const teamAvatar = document.getElementById("playerTeamAvatar");
  const episodes = getCurrentEpisodes();
  const currentDub = playerPageCurrentDub || "\u041E\u0437\u0432\u0443\u0447\u043A\u0430";
  const isSub = /субтит|sub/i.test(currentDub) || episodes.some((ep) => ep?.isSubs) || Boolean(playerPageAnime?.subtitleLogos?.[currentDub]);
  const displayName = formatDubDisplayName(currentDub, isSub);
  if (teamNameEl) teamNameEl.textContent = displayName;
  if (teamEpBadge) teamEpBadge.textContent = `${episodes.length} \u0435\u043F.`;
  if (teamTypeBadge) {
    teamTypeBadge.textContent = isSub ? "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u0438" : "\u041E\u0437\u0432\u0443\u0447\u043A\u0430";
    teamTypeBadge.className = isSub ? "player-team-badge player-team-badge--sub" : "player-team-badge player-team-badge--dub";
  }
  if (teamAvatar) {
    const logoUrl = playerPageAnime?.dubLogos?.[currentDub] || playerPageAnime?.subtitleLogos?.[currentDub] || playerPageAnime?.seasons?.[playerPageCurrentSeason]?.[currentDub]?.find((ep) => ep?.teamLogo)?.teamLogo || "";
    const words = String(displayName || currentDub).trim().split(/\s+/);
    let initials = "";
    if (words.length >= 2) {
      initials = (words[0][0] || "") + (words[1][0] || "");
    } else if (words.length === 1 && words[0].length >= 2) {
      initials = words[0].slice(0, 2);
    } else {
      initials = (words[0] || (isSub ? "\u0421\u0411" : "\u041E\u0417")).slice(0, 2);
    }
    initials = initials.toUpperCase();
    if (logoUrl) {
      teamAvatar.innerHTML = `<img src="${escapeHtml2(logoUrl)}" alt="${escapeHtml2(displayName)}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex'"><span class="player-team-initials" style="display:none">${escapeHtml2(initials)}</span>`;
    } else {
      teamAvatar.innerHTML = `<span class="player-team-initials">${escapeHtml2(initials)}</span>`;
    }
  }
  const seasons = Object.keys(playerPageAnime?.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
  const seasonSection = document.getElementById("playerSeasonSelectSection");
  if (seasonSection) {
    seasonSection.style.display = !playerAnimeIsMovie() && seasons.length > 1 ? "block" : "none";
  }
  const updatedEl = document.getElementById("playerUpdatedText");
  if (updatedEl) {
    updatedEl.textContent = "\u041E\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u043D\u0435\u0449\u043E\u0434\u0430\u0432\u043D\u043E";
  }
}
function initPlayerAccordions() {
  document.querySelectorAll("#playerControls .player-accordion-block").forEach((block) => {
    const panel = block.querySelector(".player-accordion-panel");
    block.classList.add("is-open");
    if (panel) panel.hidden = false;
  });
}
function initCompactAccordions() {
  document.querySelectorAll("#playerCompactControls .player-compact-accordion").forEach((block) => {
    block.classList.add("is-open");
    const panel = block.querySelector(".player-compact-options");
    if (panel) panel.hidden = false;
  });
}
function renderCompactPlayerSelectors() {
  updateTeamCard();
  const episodes = getCurrentEpisodes();
  const seasons = Object.keys(playerPageAnime?.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
  const seasonKey = playerPageCurrentSeason || seasons[0] || "1";
  const seasonData = playerPageAnime?.seasons?.[seasonKey] || playerPageAnime?.seasons?.[String(seasonKey)] || playerPageAnime?.seasons?.[Number(seasonKey)] || Object.values(playerPageAnime?.seasons || {})[0] || {};
  const dubs = Object.keys(seasonData).sort();
  const isSub = (dubName) => {
    const list = seasonData[dubName] || [];
    return /субтит|sub/i.test(dubName) || list.some((ep) => ep?.isSubs) || Boolean(playerPageAnime?.subtitleLogos?.[dubName]);
  };
  const voiceDubs = dubs.filter((d) => !isSub(d));
  const subDubs = dubs.filter((d) => isSub(d));
  const dubControls = document.getElementById("playerDubControls");
  if (dubControls) {
    const renderDubItem = (d) => {
      const active = d === playerPageCurrentDub ? " active" : "";
      const dubEps = seasonData[d] || [];
      const logoUrl = playerPageAnime?.dubLogos?.[d] || playerPageAnime?.subtitleLogos?.[d] || dubEps.find((ep) => ep?.teamLogo)?.teamLogo || "";
      const dubIsSub = isSub(d);
      const displayName = formatDubDisplayName(d, dubIsSub);
      const words = String(displayName || d).trim().split(/\s+/);
      let initials = (words.length >= 2 ? (words[0][0] || "") + (words[1][0] || "") : words[0]?.slice(0, 2) || (dubIsSub ? "\u0421\u0411" : "\u041E\u0417")).toUpperCase();
      const avatarHtml = logoUrl ? `<img src="${escapeHtml2(logoUrl)}" alt="${escapeHtml2(displayName)}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex'"><span class="player-dub-item-avatar-fallback" style="display:none">${escapeHtml2(initials)}</span>` : `<span class="player-dub-item-avatar-fallback">${escapeHtml2(initials)}</span>`;
      return `<button type="button" class="player-dub-item${active}" data-dub="${escapeHtml2(String(d))}" title="${escapeHtml2(displayName)}">
                        <div class="player-dub-item-left">
                            <div class="player-dub-item-avatar">${avatarHtml}</div>
                            <span class="player-dub-item-name">${escapeHtml2(displayName)}</span>
                            <span class="player-dub-item-badge">${dubEps.length} \u0435\u043F.</span>
                        </div>
                        <div class="player-dub-item-right">
                            <span class="player-dub-item-check" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </span>
                        </div>
                    </button>`;
    };
    let html = "";
    if (voiceDubs.length) {
      html += `<div class="player-team-group-title">\u041E\u0437\u0432\u0443\u0447\u043A\u0430</div><div class="player-dub-group">${voiceDubs.map(renderDubItem).join("")}</div>`;
    }
    if (subDubs.length) {
      html += `<div class="player-team-group-title">\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u0438</div><div class="player-dub-group">${subDubs.map(renderDubItem).join("")}</div>`;
    }
    if (!html) {
      html = '<span class="player-compact-empty">\u041E\u0437\u0432\u0443\u0447\u043A\u0438 \u0449\u0435 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u0456.</span>';
    }
    dubControls.innerHTML = html;
  }
  const seasonSelectEl = document.getElementById("episodeSeasonRow");
  if (seasonSelectEl) {
    seasonSelectEl.innerHTML = seasons.length ? seasons.map((s) => {
      const active = s === playerPageCurrentSeason ? " active" : "";
      return `<button type="button" class="season-num${active}" data-season="${escapeHtml2(String(s))}">\u0421\u0435\u0437\u043E\u043D ${escapeHtml2(String(s))}</button>`;
    }).join("") : "";
  }
  const currentIndex = episodes.findIndex((ep) => String(ep.episode) === String(playerPageCurrentEpisodeNum));
  document.getElementById("playerPrevEpisode")?.toggleAttribute("disabled", currentIndex <= 0 || !episodes.length);
  document.getElementById("playerNextEpisode")?.toggleAttribute("disabled", currentIndex < 0 || currentIndex >= episodes.length - 1);
}
function updateFilterChip() {
  const chip = document.getElementById("playerFilterChip");
  if (chip) chip.textContent = `\u0421\u0435\u0437\u043E\u043D ${playerPageCurrentSeason} \xB7 ${playerPageCurrentDub}`;
  const watchFilterValue = document.getElementById("watchFilterValue");
  if (watchFilterValue) watchFilterValue.textContent = `\u0421\u0435\u0437\u043E\u043D ${playerPageCurrentSeason} \xB7 ${playerPageCurrentDub}`;
  renderSeasonTabs();
  renderCompactPlayerSelectors();
}
function renderSeasonTabs() {
  const sectionTitle = document.getElementById("episodeSectionTitle");
  if (!sectionTitle) return;
  const seasons = Object.keys(playerPageAnime?.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
  if (playerAnimeIsMovie()) {
    sectionTitle.hidden = true;
    return;
  }
  sectionTitle.hidden = false;
  if (seasons.length <= 1) {
    sectionTitle.textContent = `\u0421\u0435\u0437\u043E\u043D ${playerPageCurrentSeason || 1}`;
    sectionTitle.classList.add("single");
    return;
  }
  sectionTitle.classList.remove("single");
  sectionTitle.innerHTML = seasons.map((s) => {
    const active = s === playerPageCurrentSeason ? " active-season-tab" : "";
    return `<span class="season-tab${active}" data-season="${s}">\u0421\u0435\u0437\u043E\u043D ${s}</span>`;
  }).join("");
  sectionTitle.querySelectorAll(".season-tab").forEach((tab) => {
    tab.addEventListener("click", () => selectSeasonFromSheet(tab.dataset.season));
  });
}
function closeWatchPage() {
  document.getElementById("page-info")?.classList.add("active");
  if (playerPagePlayer) {
    try {
      if (typeof playerPagePlayer._persistProgress === "function") {
        playerPagePlayer._persistProgress(true);
      }
    } catch (e) {
    }
    if (playerPagePlayer._timeUpdateListener && playerPagePlayer.videoRef) {
      playerPagePlayer.videoRef.removeEventListener("timeupdate", playerPagePlayer._timeUpdateListener);
    }
    playerPagePlayer.destroy();
    playerPagePlayer = null;
  }
  Storage._flushSync?.("history");
  document.getElementById("playerVideoContainer").classList.remove("active");
  document.getElementById("playerPageVideo").innerHTML = "";
}
function buildSeasonRow(seasons) {
  const row = document.getElementById("episodeSeasonRow");
  if (!row) return;
  const seasonBlock = row.closest(".player-control-block");
  const showSeasonChoice = !playerAnimeIsMovie() && seasons.length > 1;
  if (seasonBlock) seasonBlock.hidden = !showSeasonChoice;
  let html = `<span>\u0421\u0435\u0437\u043E\u043D</span>`;
  seasons.forEach((s) => {
    const active = s === playerPageCurrentSeason ? " active" : "";
    html += `<div class="season-num${active}" data-season="${s}">${s}</div>`;
  });
  row.innerHTML = html;
  row.querySelectorAll(".season-num").forEach((btn) => {
    btn.addEventListener("click", () => {
      const season = btn.dataset.season;
      if (season === playerPageCurrentSeason) return;
      playerPageCurrentSeason = season;
      const dubs = Object.keys(playerPageAnime.seasons[season] || {}).sort();
      playerPageCurrentDub = dubs[0] || "";
      row.querySelectorAll(".season-num").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      buildEpisodeViews();
      updateFilterChip();
      updatePlayFabLabel();
      buildBottomSheetData();
    });
  });
}
function getCurrentEpisodes() {
  if (!playerPageAnime || !playerPageAnime.seasons) return [];
  const seasonKey = playerPageCurrentSeason || Object.keys(playerPageAnime.seasons)[0] || "1";
  const seasonData = playerPageAnime.seasons[seasonKey] || playerPageAnime.seasons[String(seasonKey)] || playerPageAnime.seasons[Number(seasonKey)] || Object.values(playerPageAnime.seasons)[0] || {};
  const dubKey = playerPageCurrentDub || Object.keys(seasonData)[0] || "";
  const eps = seasonData[dubKey] || seasonData[String(dubKey)] || Object.values(seasonData)[0] || [];
  return Array.isArray(eps) ? eps : [];
}
function getEpisodeProgress(episode) {
  const history2 = Storage.getHistory();
  const animeUrl = playerPageCurrentAnimeUrl;
  const found = history2.find((h) => h.url === animeUrl && sameEpisodeValue(h.episode, episode) && normalizeEpisodeValue(h.season, "1") === normalizeEpisodeValue(playerPageCurrentSeason, "1"));
  return found ? Math.min(found.progress || 0, 100) : 0;
}
function setSectionState(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? "" : "none";
}
function cleanPlayerSynopsis(value) {
  return String(value || "").replace(/\s*(?:\(|\[)?\s*(?:Джерело|Источник|Source)\s*(?::|—|-)?\s*[^.!?\n\]]*(?:[.!?]|\])?/giu, " ").replace(/\s+/g, " ").trim();
}
function formatJikanDuration(value) {
  if (value === null || value === void 0 || value === "") return "";
  if (Number.isFinite(Number(value))) return `${Number(value)} \u0445\u0432\u0438\u043B\u0438\u043D`;
  const m = String(value).match(/(\d+)\s*min/i);
  return m ? `${m[1]} \u0445\u0432\u0438\u043B\u0438\u043D` : String(value);
}
function formatNextEpisodeDate(date) {
  if (!date) return "\u0414\u0430\u0442\u0430 \u043D\u0435\u0432\u0456\u0434\u043E\u043C\u0430";
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function nextBroadcastDate(broadcast) {
  if (!broadcast?.day || !broadcast?.time) return null;
  const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const targetDay = days[String(broadcast.day).toLowerCase()];
  if (targetDay === void 0) return null;
  const [hour, minute] = String(broadcast.time).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const now = /* @__PURE__ */ new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(now).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]));
  const tokyoWall = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second));
  const currentDay = tokyoWall.getUTCDay();
  let delta = (targetDay - currentDay + 7) % 7;
  const candidateWall = new Date(tokyoWall);
  candidateWall.setUTCDate(candidateWall.getUTCDate() + delta);
  candidateWall.setUTCHours(hour, minute, 0, 0);
  if (candidateWall <= tokyoWall) candidateWall.setUTCDate(candidateWall.getUTCDate() + 7);
  const tokyoOffset = tokyoWall.getTime() - now.getTime();
  return new Date(candidateWall.getTime() - tokyoOffset);
}
function countdownText(date) {
  const ms = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "\u041E\u0447\u0456\u043A\u0443\u0454\u043C\u043E \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044F";
  const totalMinutes = Math.floor(ms / 6e4);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor(totalMinutes % 1440 / 60);
  const mins = totalMinutes % 60;
  if (days) return `\u0412\u0438\u0445\u0456\u0434 \u0447\u0435\u0440\u0435\u0437 ${days} \u0434\u043D. ${hours} \u0433\u043E\u0434.`;
  if (hours) return `\u0412\u0438\u0445\u0456\u0434 \u0447\u0435\u0440\u0435\u0437 ${hours} \u0433\u043E\u0434. ${mins} \u0445\u0432.`;
  return `\u0412\u0438\u0445\u0456\u0434 \u0447\u0435\u0440\u0435\u0437 ${Math.max(mins, 1)} \u0445\u0432.`;
}
function renderAnimeInformation(data) {
  const root = document.getElementById("animeInfoGrid");
  if (!root) return;
  const type = data?.type || (playerAnimeIsMovie() ? "Movie" : "TV");
  const typeLabel = type === "TV" ? "TV \u0421\u0435\u0440\u0456\u0430\u043B" : type === "Movie" ? "\u0424\u0456\u043B\u044C\u043C" : type || "\u2014";
  const status = data?._statusLabel || JIKAN_STATUS_LABELS[data?.status] || ANILIST_STATUS_LABELS[data?.status] || data?.status || "\u2014";
  const derivedYear = data?.year || "";
  const seasonYear = data?.season && derivedYear ? `${SEASON_LABELS[data.season] || data.season} ${derivedYear}` : derivedYear || "\u2014";
  const episodeCount = playerPageAnime?.totalEpisodes ?? "\u2014";
  const nextDate = data?._nextAiringDate instanceof Date && !Number.isNaN(data._nextAiringDate.getTime()) ? data._nextAiringDate : data?.airing ? nextBroadcastDate(data.broadcast) : null;
  const nextEpisode = data?._nextEpisode || (data?.airing && Number.isFinite(Number(data?.episodes)) ? Number(data.episodes) + 1 : null);
  const next = nextDate ? `${nextEpisode ? `\u0415\u043F\u0456\u0437\u043E\u0434 ${nextEpisode} \xB7 ` : ""}${formatNextEpisodeDate(nextDate)}` : data?.airing ? "\u0414\u0430\u0442\u0430 \u043D\u0435\u0432\u0456\u0434\u043E\u043C\u0430" : "\u2014";
  const studio = data?.studios?.[0]?.name || "\u2014";
  const studioLogo = data?.studios?.[0]?.logo || "";
  const rating = data?.rating || "\u2014";
  const rows = [
    ["\u0422\u0438\u043F", typeLabel],
    ["\u0421\u0442\u0430\u0442\u0443\u0441", `<span class="anime-info-badge">${escapeHtml2(status)}</span>`],
    ["\u0421\u0435\u0437\u043E\u043D / \u0440\u0456\u043A", seasonYear],
    ["\u0415\u043F\u0456\u0437\u043E\u0434\u0438", episodeCount || "\u2014"],
    ["\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0435\u043F\u0456\u0437\u043E\u0434", next],
    ["\u0422\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C \u0435\u043F\u0456\u0437\u043E\u0434\u0443", formatJikanDuration(data?.duration) || "\u2014"],
    ["\u0420\u0435\u0439\u0442\u0438\u043D\u0433", rating],
    ["\u0416\u0430\u043D\u0440\u0438", normalizeGenreList3(playerPageAnime?.genres).join(" \xB7 ") || "\u2014"],
    ["\u0421\u0442\u0443\u0434\u0456\u044F", studioLogo ? `${escapeHtml2(studio)}<img class="anime-info-studio-logo" src="${escapeHtml2(studioLogo)}" alt="" loading="lazy" onerror="this.remove()">` : studio]
  ];
  root.innerHTML = rows.map(([label, value]) => `<div class="anime-info-row"><span>${escapeHtml2(label)}</span><strong>${String(value).includes("anime-info-badge") || String(value).includes("anime-info-studio-logo") ? value : escapeHtml2(String(value))}</strong></div>`).join("");
  const countdown = document.getElementById("animeCountdown");
  if (playerCountdownTimer) {
    clearInterval(playerCountdownTimer);
    playerCountdownTimer = null;
  }
  if (countdown) countdown.textContent = nextDate ? countdownText(nextDate) : "";
  if (nextDate) playerCountdownTimer = setInterval(() => {
    if (countdown) countdown.textContent = countdownText(nextDate);
  }, 6e4);
}
function renderMainCharacters(data) {
  const list = document.getElementById("mainCharactersList");
  const more = document.getElementById("mainCharactersMoreBtn");
  if (!list) return;
  playerCharacterItems = (data?.characters || []).filter((x) => x?.character?.name).map((x) => ({
    name: x.character.name,
    original: x.character.name_kanji,
    role: x.role,
    image: jikanImage(x.character),
    voice: x.voice_actors?.find((v) => v.language === "Japanese")?.person?.name || ""
  })).sort((a, b) => (a.role === "Main" || a.role === "\u0413\u043E\u043B\u043E\u0432\u043D\u0430 \u0440\u043E\u043B\u044C" ? 0 : 1) - (b.role === "Main" || b.role === "\u0413\u043E\u043B\u043E\u0432\u043D\u0430 \u0440\u043E\u043B\u044C" ? 0 : 1));
  const items = playerCharacterExpanded ? playerCharacterItems : playerCharacterItems.slice(0, 8);
  if (!items.length) {
    list.innerHTML = "";
    if (more) more.hidden = true;
    setSectionState("mainCharactersSection", false);
    return;
  }
  setSectionState("mainCharactersSection", true);
  list.innerHTML = items.map((c) => `<article class="cast-card character-card"><div class="cast-avatar" style="${c.image ? `background-image:url('${escapeHtml2(c.image)}')` : ""}"></div><div class="cast-name">${escapeHtml2(c.name)}</div>${c.original ? `<div class="character-original">${escapeHtml2(c.original)}</div>` : ""}<div class="cast-role">${escapeHtml2([c.role, c.voice ? `\u0421\u0435\u0439\u044E: ${c.voice}` : ""].filter(Boolean).join(" \xB7 "))}</div></article>`).join("");
  if (more) {
    more.hidden = playerCharacterItems.length <= 8;
    more.textContent = playerCharacterExpanded ? "\u2190" : "\u2192";
  }
}
async function localizeRelatedItem(item) {
  const key = normalizeRelatedKey(item?.titleEn || item?.title);
  if (!key) return item;
  if (relatedLocalizationCache.has(key)) return relatedLocalizationCache.get(key);
  const promise = (async () => {
    try {
      const results = await searchHikkaAllTitles2(item.titleEn || item.title, 1);
      const exact = (results || []).find((candidate) => {
        const names = [candidate.title, candidate.originalTitle, ...candidate.alternativeTitles || []].map(normalizeRelatedKey).filter(Boolean);
        return names.some((name) => name === key || name.includes(key) || key.includes(name));
      });
      const match = exact || (results || [])[0];
      if (match) {
        return {
          ...item,
          title: match.title || item.title,
          titleEn: item.titleEn || match.originalTitle || item.titleEn,
          image: item.image || match.images?.jpg?.large_image_url || match.images?.jpg?.image_url || "",
          typeLabel: match.typeLabel || item.typeLabel,
          relationLabel: item.relationLabel
        };
      }
    } catch (error) {
      console.warn("Related Ukrainian localization failed:", error);
    }
    return item;
  })();
  relatedLocalizationCache.set(key, promise);
  return promise;
}
function relatedCardMarkup(x) {
  const rawTitle = x.title || x.titleEn || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
  const title = RELATED_TITLE_OVERRIDES_UA[normalizeRelatedKey(x.titleEn || x.title)] || rawTitle;
  const poster = normalizePosterUrl2(x.image || "");
  const typeLabel = relatedTypeLabelUa(x.typeLabel);
  const relationLabel = relatedRelationLabelUa(x.relationLabel);
  return `<article class="related-card" data-related-title="${escapeHtml2(title)}" data-related-title-en="${escapeHtml2(x.titleEn || "")}"><img src="${escapeHtml2(poster)}" alt="${escapeHtml2(title)}" loading="lazy" onerror="this.onerror=null;this.src='./assets/icons/android-chrome-512x512.png';this.classList.add('poster-fallback')"><div><strong>${escapeHtml2(title)}</strong><span>${escapeHtml2([x.year, typeLabel, relationLabel].filter(Boolean).join(" \xB7 "))}</span></div></article>`;
}
async function openRelatedAnimeInPlayer(card) {
  if (!card || card.classList.contains("is-loading")) return;
  const title = card.dataset.relatedTitle || "";
  const titleEn = card.dataset.relatedTitleEn || "";
  if (!title && !titleEn) return;
  card.classList.add("is-loading");
  try {
    const queries = [...new Set([title, titleEn].filter(Boolean))];
    let results = [];
    for (const query2 of queries) {
      results = await searchHikka3(query2, 1);
      if (results?.length) break;
    }
    const normalizeTitle = (value) => String(value || "").toLocaleLowerCase("uk-UA").replace(/[\u2010-\u2015:!?.,'’"()\[\]{}]/g, " ").replace(/\s+/g, " ").trim();
    const wanted = queries.map(normalizeTitle).filter(Boolean);
    const exact = (results || []).find((item) => {
      const names = [item.title, item.originalTitle, ...item.alternativeTitles || []].map(normalizeTitle);
      return names.some((name) => wanted.includes(name) || wanted.some((q) => q === name || q.includes(name) || name.includes(q)));
    });
    const match = exact || results?.[0];
    if (match?.url) openPlayerPage2(match.url);
    else showToast(`\xAB${title}\xBB \u0449\u0435 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0437\u0456 VakDab`);
  } catch (e) {
    showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043F\u043E\u0432\u2019\u044F\u0437\u0430\u043D\u0435 \u0430\u043D\u0456\u043C\u0435");
  } finally {
    card.classList.remove("is-loading");
  }
}
async function renderRelatedAnimeFromJikan(data) {
  const current = Number(data?.mal_id);
  const entries = (data?.relations || []).flatMap((group) => (group.entry || []).map((entry) => ({ ...entry, relation: group.relation }))).filter((x) => x.mal_id && Number(x.mal_id) !== current);
  const unique = [...new Map(entries.map((x) => [x.mal_id, x])).values()];
  const detailItems = unique.slice(0, 24);
  const details = await Promise.allSettled(detailItems.map((x) => fetchJikan(`/anime/${x.mal_id}`)));
  return unique.map((x, i) => {
    const result = i < details.length ? details[i] : null;
    const full = result?.status === "fulfilled" ? result.value.data : {};
    return { url: full.url || x.url, image: jikanImage(full) || jikanImage(x), title: full.title || x.name, titleEn: full.title || x.name, year: full.year || (full.aired?.from || "").slice(0, 4), typeLabel: full.type || "", relationLabel: x.relation };
  });
}
async function renderRelatedAnimeFromAnilist(data) {
  if (!data?._anilistId) return [];
  const edges = await fetchAnilistRelations(data._anilistId);
  const filtered = edges.filter((e) => e.node?.id !== data._anilistId && e.node?.type === "ANIME");
  const unique = [...new Map(filtered.map((e) => [e.node.id, e])).values()];
  return unique.map((e) => ({
    url: e.node.siteUrl,
    image: e.node.coverImage?.large,
    title: e.node.title?.romaji || e.node.title?.english,
    titleEn: e.node.title?.english || e.node.title?.romaji,
    year: e.node.startDate?.year,
    typeLabel: ANILIST_FORMAT_LABELS[e.node.format] || e.node.format,
    relationLabel: ANILIST_RELATION_LABELS[e.relationType] || null
  }));
}
async function renderRelatedAnime(data, anime) {
  const list = document.getElementById("relatedList");
  const more = document.getElementById("relatedMoreBtn");
  if (!list) return;
  try {
    const targetAnime = anime || playerPageAnime;
    let rawItems = Array.isArray(data?.relations) && data.relations.length ? await renderRelatedAnimeFromJikan(data) : [];
    if (!rawItems.length) rawItems = await fetchAnimeRelations(targetAnime, data);
    const exactTitle = targetAnime?.originalTitle || targetAnime?.title || "";
    if (!rawItems.length && exactTitle) {
      const exactJikan = await withTimeout(
        resolveJikanByTitle(exactTitle),
        5e3,
        "Jikan relations fallback timeout"
      );
      if (exactJikan?.relations?.length) rawItems = await renderRelatedAnimeFromJikan(exactJikan);
    }
    if (rawItems && rawItems.length > 0) {
      playerRelatedItems = await Promise.all(rawItems.map(localizeRelatedItem));
    } else if (data?._provider === "anilist") {
      const anilistItems = await renderRelatedAnimeFromAnilist(data);
      playerRelatedItems = await Promise.all(anilistItems.map(localizeRelatedItem));
    } else if (data) {
      const jikanItems = await renderRelatedAnimeFromJikan(data);
      playerRelatedItems = await Promise.all(jikanItems.map(localizeRelatedItem));
    } else {
      playerRelatedItems = [];
    }
  } catch (e) {
    console.warn("Related anime lookup failed:", e);
    playerRelatedItems = [];
  }
  if (!playerRelatedItems.length) {
    setSectionState("relatedSection", false);
    return;
  }
  setSectionState("relatedSection", true);
  const visible = playerRelatedExpanded ? playerRelatedItems : playerRelatedItems.slice(0, 4);
  list.innerHTML = visible.map(relatedCardMarkup).join("");
  list.querySelectorAll(".related-card").forEach((card) => card.addEventListener("click", () => openRelatedAnimeInPlayer(card)));
  const count = document.getElementById("relatedCount");
  if (count) count.textContent = `(${playerRelatedItems.length})`;
  if (more) {
    more.hidden = playerRelatedItems.length <= 4;
    more.textContent = playerRelatedExpanded ? "\u2190" : "\u2192";
  }
}
async function loadAndRenderJikanExtras(anime) {
  try {
    const data = await resolveJikanAnime(anime);
    if (playerPageCurrentAnimeUrl !== anime.url) return;
    if (!data) {
      const infoGrid = document.getElementById("animeInfoGrid");
      if (infoGrid) infoGrid.innerHTML = '<div class="anime-info-placeholder">\u0420\u043E\u0437\u0448\u0438\u0440\u0435\u043D\u0430 \u0456\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0456\u044F \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430</div>';
      setSectionState("relatedSection", false);
      setSectionState("mainCharactersSection", false);
      await renderRelatedAnime(null, anime);
      return;
    }
    playerJikanData = data;
    const promoFrame = data?.trailer?.images?.maximum_image_url || data?.trailer?.images?.large_image_url;
    if (promoFrame && !playerPageIsPlaying && !playerPagePlayer?.videoRef) {
      const frame = document.getElementById("playerFramePoster");
      if (frame && frame.classList.contains("is-hidden")) {
        setPlayerFramePoster(promoFrame);
      }
    }
    renderAnimeInformation(data);
    renderMainCharacters(data);
    if (document.getElementById("castSection")?.style.display === "none") renderVoiceCast(data);
    await renderRelatedAnime(data, anime);
  } catch (e) {
    console.warn("Anime extras unavailable:", e);
    const infoGrid = document.getElementById("animeInfoGrid");
    if (infoGrid) infoGrid.innerHTML = '<div class="anime-info-placeholder">\u0420\u043E\u0437\u0448\u0438\u0440\u0435\u043D\u0430 \u0456\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0456\u044F \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430</div>';
    const mainCharactersList = document.getElementById("mainCharactersList");
    if (mainCharactersList && !playerCharacterItems.length) {
      setSectionState("mainCharactersSection", true);
      mainCharactersList.innerHTML = '<div class="player-empty-episodes">\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0456 \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0456</div>';
    }
    await renderRelatedAnime(null, anime);
  }
}
function localizeCastCharacter(value) {
  const raw = String(value || "").trim();
  const isVoice = /\(\s*voice\s*\)/i.test(raw);
  const clean = raw.replace(/\s*\(\s*voice\s*\)\s*/gi, "").trim();
  const localized = CAST_CHARACTER_NAMES_UA[clean.toLocaleLowerCase("uk-UA")] || clean;
  return isVoice ? `\u041E\u0437\u0432\u0443\u0447\u0443\u0454: ${localized}` : localized;
}
function renderVoiceCast(data) {
  const section = document.getElementById("castSection");
  const list = document.getElementById("castList");
  if (!section || !list) return;
  const cast = (data?.characters || []).filter((x) => x?.character?.name && x?.voice_actors?.length).slice(0, 12);
  if (!cast.length) return;
  section.style.display = "";
  section.querySelector(".section-title").textContent = "\u0410\u043A\u0442\u043E\u0440\u0438 / \u0441\u0435\u0439\u044E";
  list.innerHTML = cast.map((x) => {
    const c = x.character;
    const voice = x.voice_actors?.find((v) => v.language === "Japanese") || x.voice_actors?.[0];
    const person = voice?.person || {};
    const avatar = jikanImage(person);
    const style = avatar ? `background-image:url('${escapeHtml2(avatar)}');` : "";
    return `<article class="cast-card"><div class="cast-avatar" style="${style}"></div><div class="cast-name">${escapeHtml2(person.name || "\u0421\u0435\u0439\u044E \u043D\u0435\u0432\u0456\u0434\u043E\u043C\u0438\u0439")}</div><div class="cast-role">${escapeHtml2(localizeCastCharacter(c.name))}</div></article>`;
  }).join("");
}
function attachEpisodeClickHandlers(container) {
  if (!container) return;
  container.querySelectorAll("[data-file]").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const epNum = card.dataset.episode;
      if (!epNum) return;
      playerPageCurrentEpisodeNum = epNum;
      setAccordionSummary("playerEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${epNum}`);
      setAccordionSummary("playerCompactEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${epNum}`);
      const episodes = getCurrentEpisodes();
      renderAllEpisodeViews(episodes);
      playEpisode(card.dataset.file, epNum);
    });
  });
}
function renderAllEpisodeViews(episodes) {
  const picker = document.getElementById("episodeViewGrid");
  const compactContainer = document.getElementById("episodeViewCompact");
  const classicContainer = document.getElementById("episodeViewClassic");
  if (!picker) return;
  if (!episodes.length) {
    const emptyHtml = '<div class="player-empty-episodes">\u0421\u0435\u0440\u0456\u0457 \u0449\u0435 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u0456 \u0434\u043B\u044F \u0446\u0456\u0454\u0457 \u043E\u0437\u0432\u0443\u0447\u043A\u0438.</div>';
    picker.innerHTML = emptyHtml;
    if (compactContainer) compactContainer.innerHTML = "";
    if (classicContainer) classicContainer.innerHTML = "";
    updateTeamCard();
    return;
  }
  picker.innerHTML = episodes.map((ep) => {
    const active = sameEpisodeValue(ep.episode, playerPageCurrentEpisodeNum) ? " active" : "";
    const progress = getEpisodeProgress(ep.episode);
    const completed = progress >= 88 ? " is-completed" : "";
    const isWatched = progress > 0 || completed || Boolean(active);
    return `<button type="button" class="player-episode-btn${active}${completed}" data-file="${escapeHtml2(ep.file || "")}" data-episode="${escapeHtml2(ep.episode || "")}" aria-label="\u0421\u0435\u0440\u0456\u044F ${escapeHtml2(String(ep.episode))}">
                    <span class="player-episode-number">${escapeHtml2(String(ep.episode || "\u2014"))}</span>
                    <span class="player-episode-eye${isWatched ? " is-watched" : ""}" aria-hidden="true">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </span>
                    ${progress > 0 ? `<span class="player-episode-progress" style="--progress:${progress}%"></span>` : ""}
                </button>`;
  }).join("");
  if (compactContainer) compactContainer.innerHTML = "";
  if (classicContainer) classicContainer.innerHTML = "";
  attachEpisodeClickHandlers(picker);
  updateTeamCard();
}
async function buildEpisodeViews() {
  const episodes = getCurrentEpisodes();
  playerPageEpisodes = episodes;
  renderAllEpisodeViews(episodes);
}
function playerAnimeIsMovie(anime = playerPageAnime) {
  return anime?.type === "movie" || (anime?.genres || []).some((g) => /повнометраж|фільм|movie/i.test(g));
}
function setPlayerFramePoster(frameUrl = "") {
  const frame = document.getElementById("playerFramePoster");
  if (!frame) return;
  const url = frameUrl || "";
  if (url) {
    frame.src = url;
    frame.classList.remove("is-hidden");
  } else {
    frame.classList.add("is-hidden");
  }
}
function hidePlayerFramePoster() {
  const frame = document.getElementById("playerFramePoster");
  if (frame) frame.classList.add("is-hidden");
}
async function updatePlayerVideoFrame(anime = playerPageAnime, episodeNum = playerPageCurrentEpisodeNum) {
  if (!anime) return;
  const requestedAnimeUrl = anime.url;
  const requestedEp = episodeNum;
  try {
    const frameUrl = await resolveAnimeVideoFrame(anime, requestedEp);
    if (frameUrl && playerPageCurrentAnimeUrl === requestedAnimeUrl && !playerPageIsPlaying && !playerPagePlayer?.videoRef) {
      setPlayerFramePoster(frameUrl);
    }
  } catch (e) {
    console.warn("[VideoFrame] Update skipped:", e);
  }
}
function formatMovieRuntime(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return "";
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return h ? `${h} \u0433\u043E\u0434 ${m ? m + " \u0445\u0432" : ""}`.trim() : `${m} \u0445\u0432`;
}
async function attachAniSkip2(video, episode, segmentsPromise = null, playbackRequest = playerPagePlaybackRequest) {
  return attachAniSkip(video, episode, {
    anime: playerPageAnime,
    segmentsPromise,
    playbackRequest,
    getCurrentPlaybackRequest: () => playerPagePlaybackRequest,
    isPlayerOpen: () => playerPageIsOpen,
    playerInstance: playerPagePlayer
  });
}
async function playEpisode(file, epNum, options = {}) {
  if (!file) {
    showToast("\u041D\u0435\u043C\u0430\u0454 \u0444\u0430\u0439\u043B\u0443 \u0434\u043B\u044F \u0432\u0456\u0434\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F");
    return;
  }
  if (!playerPageIsOpen) return;
  const autoplay = options?.autoplay !== false;
  cleanupAniSkip();
  const playbackRequest = ++playerPagePlaybackRequest;
  playerPageCurrentEpisodeNum = epNum || "1";
  if (playerPagePlayer) {
    playerPagePlayer.destroy();
    playerPagePlayer = null;
  }
  if (autoplay && handoffToSenPlayer(file)) return;
  const openingSegmentsPromise = getAniSkipSegments(playerPageAnime, epNum);
  setAccordionSummary("playerEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${playerPageCurrentEpisodeNum}`);
  setAccordionSummary("playerCompactEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${playerPageCurrentEpisodeNum}`);
  renderAllEpisodeViews(getCurrentEpisodes(), null, null);
  const videoContainer = document.getElementById("playerVideoContainer");
  const videoDiv = document.getElementById("playerPageVideo");
  hidePlayerFramePoster();
  videoContainer.classList.add("active");
  videoContainer.classList.add("has-played");
  videoContainer.scrollIntoView({ behavior: "smooth", block: "center" });
  const videoTitleEl = document.getElementById("playerTopbarTitle");
  if (videoTitleEl) videoTitleEl.textContent = playerPageAnime?.title || "";
  videoDiv.innerHTML = "";
  let finalUrl = file;
  try {
    finalUrl = await resolveUniversalPlaybackUrl2(file);
  } catch (error) {
    if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
    console.warn("[Universal playback resolution]", error);
    finalUrl = file;
  }
  if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
  if (autoplay && handoffToSenPlayer(finalUrl)) return;
  if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
  const episodeOptions = getCurrentEpisodes().filter((ep) => ep?.file).map((ep) => ({
    episode: ep.episode,
    file: ep.file
  }));
  playerPagePlayer = new LampaPlayer(videoDiv, {
    poster: playerPageAnime?.images?.jpg?.large_image_url,
    episode: epNum,
    episodeOptions,
    autoplay,
    onBeforeUserPlay: () => handoffToSenPlayer(finalUrl),
    onEpisodeSelect: (item) => playEpisode(item.file, item.episode)
  });
  await playerPagePlayer.loadSource(finalUrl, playerPageAnime?.title || "", `\u0421\u0435\u0440\u0456\u044F ${epNum}`, { autoplay });
  hidePlayerFramePoster();
  if (autoplay) {
    playerPagePlayer.play({ showLoader: false });
  } else {
    playerPagePlayer.pause();
    playerPagePlayer._showControls();
  }
  playerPageHistoryUpdated = false;
  playerPageWatchStartTime = 0;
  playerPageAccumulatedWatchSeconds = 0;
  playerPageLastVideoTime = null;
  playerPageIsPlaying = false;
  const video = playerPagePlayer.videoRef;
  if (video) {
    attachAniSkip2(video, epNum, openingSegmentsPromise, playbackRequest).catch((error) => console.warn("[AniSkip] attach failed:", error));
    try {
      const savedProgress = (() => {
        const history2 = Storage.getHistory();
        const ep = normalizeEpisodeValue(epNum || "1", "1");
        const season = normalizeEpisodeValue(playerPageCurrentSeason, "1");
        const found = history2.find((h) => h.url === playerPageAnime?.url && sameEpisodeValue(h.episode, ep) && normalizeEpisodeValue(h.season, "1") === season);
        if (!found) return null;
        const pct = Number(found.progress);
        return Number.isFinite(pct) && pct >= 2 && pct < 95 ? pct : null;
      })();
      if (savedProgress != null) {
        let hasSeeked = false;
        const seekOnce = () => {
          if (hasSeeked) return;
          try {
            const dur = Number(video.duration);
            if (Number.isFinite(dur) && dur > 0) {
              hasSeeked = true;
              video.removeEventListener("loadedmetadata", seekOnce);
              video.removeEventListener("canplay", seekOnce);
              const target = Math.min(dur - 2, savedProgress / 100 * dur);
              if (target > 1) {
                video.currentTime = target;
                showToast(`\u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0443\u0454\u043C\u043E \u0437 ${Math.round(savedProgress)}%`);
              }
            }
          } catch (e) {
          }
        };
        video.addEventListener("loadedmetadata", seekOnce);
        video.addEventListener("canplay", seekOnce, { once: true });
      }
    } catch (e) {
    }
    const hideFrame = () => {
      hidePlayerFramePoster();
      playerPagePlayer?._showControls?.();
    };
    const syncPlaybackClock = () => {
      if (!playerPageIsPlaying) return;
      const currentTime = Number(video.currentTime);
      if (!Number.isFinite(currentTime)) return;
      if (playerPageLastVideoTime !== null) {
        const delta = currentTime - playerPageLastVideoTime;
        if (delta >= 0 && delta <= 5) playerPageAccumulatedWatchSeconds += delta;
      }
      playerPageLastVideoTime = currentTime;
    };
    const onPlaying = () => {
      playerPageIsPlaying = true;
      playerPageLastVideoTime = Number(video.currentTime) || 0;
      const container = document.getElementById("playerVideoContainer");
      container?.classList.add("has-played");
      container?.classList.remove("is-preview");
    };
    const onPause = () => {
      syncPlaybackClock();
      playerPageIsPlaying = false;
      playerPageLastVideoTime = Number(video.currentTime) || 0;
    };
    const onSeeking = () => {
      playerPageLastVideoTime = null;
    };
    const onSeeked = () => {
      playerPageLastVideoTime = Number(video.currentTime) || 0;
    };
    video.addEventListener("playing", hideFrame, { once: true });
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onPause);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);
    const persistEpisodeProgress = (force = false, endedProgress = null) => {
      if (!playerPageAnime || !video) return;
      const duration = Number(video.duration);
      if (!Number.isFinite(duration) || duration <= 0) return;
      const currentTime = Number(video.currentTime);
      const rawProgress = endedProgress != null ? endedProgress : Math.min(100, Math.max(0, currentTime / duration * 100));
      const watchSecondsSoFar = Math.floor(playerPageAccumulatedWatchSeconds);
      if (!force && currentTime < 2 && watchSecondsSoFar < 2) return;
      const firstSave = !playerPageHistoryUpdated;
      playerPageHistoryUpdated = true;
      const ep = normalizeEpisodeValue(epNum || playerPageCurrentEpisodeNum, "1");
      const season = normalizeEpisodeValue(playerPageCurrentSeason, "1");
      const deltaWatch = watchSecondsSoFar - playerPageWatchTimeSynced;
      if (deltaWatch > 0) {
        Storage.addWatchTime(deltaWatch);
        playerPageWatchTimeSynced = watchSecondsSoFar;
      }
      const due = force || firstSave || currentTime - playerPageLastProgressSave >= 4 || playerPageLastProgressSave === 0;
      if (!due) return;
      playerPageLastProgressSave = currentTime;
      const finalProgress = rawProgress >= 88 ? 100 : Math.round(rawProgress * 10) / 10;
      const previous = Storage.getWatchEntry(playerPageAnime.url, ep, season) || {};
      const totalEpisodes = Object.values(playerPageAnime.seasons || {}).reduce((sum, seasonData) => sum + Object.values(seasonData || {}).reduce((max, episodes) => Math.max(max, Array.isArray(episodes) ? episodes.length : 0), 0), 0);
      const seasonKeys = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => Number(a) - Number(b));
      const episodePosition = seasonKeys.reduce((sum, key) => {
        if (Number(key) >= Number(season)) return sum;
        return sum + Object.values(playerPageAnime.seasons?.[key] || {}).reduce((max, episodes) => Math.max(max, Array.isArray(episodes) ? episodes.length : 0), 0);
      }, 0) + Math.max(1, Number(ep) || 1);
      Storage.upsertWatchEntry({
        ...previous,
        animeId: previous.animeId || playerPageAnime.mal_id || (playerPageAnime.url ? String(playerPageAnime.url).split("/").filter(Boolean).pop() : "0"),
        title: playerPageAnime.title,
        poster: playerPageAnime.images?.jpg?.large_image_url || previous.poster || "",
        url: playerPageAnime.url,
        episode: ep,
        season,
        totalEpisodes: totalEpisodes || previous.totalEpisodes || 0,
        episodePosition: episodePosition || previous.episodePosition || 1,
        timestamp: Date.now(),
        progress: Math.max(Number(previous.progress) || 0, finalProgress),
        duration: Math.max(0, Math.floor(currentTime || 0)),
        totalDuration: Math.max(0, Math.floor(duration || 0))
      });
      const epClean = normalizeEpisodeValue(ep);
      const activeBtns = document.querySelectorAll(`.player-episode-btn[data-episode="${epClean}"]`);
      activeBtns.forEach((btn) => {
        let bar = btn.querySelector(".player-episode-progress");
        if (!bar && finalProgress > 0) {
          bar = document.createElement("span");
          bar.className = "player-episode-progress";
          btn.appendChild(bar);
        }
        if (bar) {
          bar.style.setProperty("--progress", `${finalProgress}%`);
        }
        if (finalProgress >= 88) {
          btn.classList.add("is-completed");
        } else {
          btn.classList.remove("is-completed");
        }
      });
      if (firstSave) {
        showToast(`\u0421\u0435\u0440\u0456\u044E ${ep} \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E \u0432 \u0456\u0441\u0442\u043E\u0440\u0456\u044E`);
      }
    };
    playerPagePlayer._persistProgress = persistEpisodeProgress;
    const onTimeUpdate = () => {
      syncPlaybackClock();
      persistEpisodeProgress();
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", () => {
      syncPlaybackClock();
      persistEpisodeProgress(true);
    });
    video.addEventListener("ended", () => {
      syncPlaybackClock();
      persistEpisodeProgress(true, 100);
    });
    if (playerPagePlayer._timeUpdateListener) {
      video.removeEventListener("timeupdate", playerPagePlayer._timeUpdateListener);
    }
    playerPagePlayer._timeUpdateListener = onTimeUpdate;
  }
  setTimeout(() => {
    videoContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}
function closePlayerPage() {
  const modal = document.getElementById("playerPageModal");
  if (!modal || !playerPageIsOpen && !modal.classList.contains("is-open")) return;
  playerPagePlayer?._persistProgress?.(true);
  cleanupAniSkip();
  Storage._flushSync("history,watchTime");
  playerPageIsOpen = false;
  playerPagePlaybackRequest += 1;
  modal.setAttribute("aria-busy", "false");
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("is-open");
  if (_playerLoadController) {
    _playerLoadController.abort();
    _playerLoadController = null;
  }
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
  }
  closePlayerTeamDropdown();
  closeWatchPage();
  modal.style.display = "none";
  document.documentElement.classList.remove("player-page-open");
  document.body.classList.remove("player-page-open");
  document.getElementById("bottomNav")?.classList.remove("hidden-nav");
  document.body.style.overflow = playerPagePreviousBodyOverflow;
  document.getElementById("episodePanel").classList.remove("visible");
  if (playerPagePreviousActiveElement && document.contains(playerPagePreviousActiveElement)) {
    playerPagePreviousActiveElement.focus({ preventScroll: true });
  }
  playerPagePreviousActiveElement = null;
  if (Router.currentRoute === "profile") renderProfilePage3();
}
function updateBookmarkButton(url) {
  const bookmarks = Storage.getBookmarks();
  const isBookmarked = bookmarks.some((b) => b.url === url);
  const btn = document.getElementById("playerBookmarkBtn");
  if (btn) {
    btn.classList.toggle("bookmarked", isBookmarked);
    btn.innerHTML = isBookmarked ? '<i class="fas fa-bookmark"></i>' : '<i class="far fa-bookmark"></i>';
  }
  const epBtn = document.getElementById("playerEpisodesBookmarkBtn");
  if (epBtn) {
    epBtn.classList.toggle("active", isBookmarked);
    epBtn.classList.toggle("bookmarked", isBookmarked);
    const epText = document.getElementById("playerEpisodesBookmarkText");
    if (epText) {
      epText.textContent = isBookmarked ? "\u0412 \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0430\u0445" : "\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0430";
    }
    const svg = epBtn.querySelector("svg");
    if (svg) {
      svg.setAttribute("fill", isBookmarked ? "currentColor" : "none");
    }
  }
  const toolbarBtn = document.getElementById("playerToolbarBookmark");
  if (toolbarBtn) {
    toolbarBtn.classList.toggle("bookmarked", isBookmarked);
    toolbarBtn.innerHTML = isBookmarked ? '<i class="fas fa-bookmark" aria-hidden="true"></i><span>\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0430</span>' : '<i class="far fa-bookmark" aria-hidden="true"></i><span>\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0430</span>';
  }
}
function toggleBookmark() {
  const url = playerPageCurrentAnimeUrl;
  if (!url) {
    showToast("\u041D\u0435\u043C\u0430\u0454 \u0430\u043D\u0456\u043C\u0435 \u0434\u043B\u044F \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0438");
    return;
  }
  const bookmarks = Storage.getBookmarks();
  const idx = bookmarks.findIndex((b) => b.url === url);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    Storage.setBookmarks(bookmarks);
    showToast("\u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u0437 \u0437\u0430\u043A\u043B\u0430\u0434\u043E\u043A");
    updateBookmarkButton(url);
    if (Router.currentRoute === "profile") renderProfilePage3();
    return;
  }
  const anime = playerPageAnime;
  if (!anime) {
    showToast("\u041F\u043E\u043C\u0438\u043B\u043A\u0430: \u043D\u0435\u043C\u0430\u0454 \u0434\u0430\u043D\u0438\u0445 \u043F\u0440\u043E \u0430\u043D\u0456\u043C\u0435");
    return;
  }
  const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2, e) => Math.max(s2, e.length), 0), 0);
  bookmarks.push({
    url: anime.url,
    title: anime.title,
    poster: anime.images?.jpg?.large_image_url || "",
    episodes: totalEpisodes + " \u0435\u043F.",
    addedAt: Date.now()
  });
  Storage.setBookmarks(bookmarks);
  showToast("\u0414\u043E\u0434\u0430\u043D\u043E \u0434\u043E \u0437\u0430\u043A\u043B\u0430\u0434\u043E\u043A");
  updateBookmarkButton(url);
  if (Router.currentRoute === "profile") renderProfilePage3();
}
function updateLikeButton() {
  const btn = document.getElementById("likeBtn");
  if (!btn) return;
  const likes = Storage.getLikes();
  const url = playerPageCurrentAnimeUrl;
  if (url && likes[url] === "like") {
    btn.classList.add("liked");
    btn.innerHTML = '<i class="fas fa-thumbs-up" style="color:#00ff88;"></i>';
  } else {
    btn.classList.remove("liked");
    btn.innerHTML = '<i class="fas fa-thumbs-up"></i>';
  }
}
function updateDislikeButton() {
  const btn = document.getElementById("dislikeBtn");
  if (!btn) return;
  const likes = Storage.getLikes();
  const url = playerPageCurrentAnimeUrl;
  if (url && likes[url] === "dislike") {
    btn.classList.add("disliked");
    btn.innerHTML = '<i class="fas fa-thumbs-down" style="color:#ff4444;"></i>';
  } else {
    btn.classList.remove("disliked");
    btn.innerHTML = '<i class="fas fa-thumbs-down"></i>';
  }
}
function toggleLike() {
  const url = playerPageCurrentAnimeUrl;
  if (!url) {
    showToast("\u041D\u0435\u043C\u0430\u0454 \u0430\u043D\u0456\u043C\u0435 \u0434\u043B\u044F \u043E\u0446\u0456\u043D\u043A\u0438");
    return;
  }
  const likes = Storage.getLikes();
  if (likes[url] === "like") {
    delete likes[url];
    Storage.setLikes(likes);
    syncAnimeRating(url, 0);
    showToast("\u041B\u0430\u0439\u043A \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
  } else {
    likes[url] = "like";
    Storage.setLikes(likes);
    syncAnimeRating(url, 1);
    showToast("\u041B\u0430\u0439\u043A");
  }
  updateLikeButton();
  updateDislikeButton();
  if (Router.currentRoute === "profile") renderProfilePage3();
}
function toggleDislike() {
  const url = playerPageCurrentAnimeUrl;
  if (!url) {
    showToast("\u041D\u0435\u043C\u0430\u0454 \u0430\u043D\u0456\u043C\u0435 \u0434\u043B\u044F \u043E\u0446\u0456\u043D\u043A\u0438");
    return;
  }
  const likes = Storage.getLikes();
  if (likes[url] === "dislike") {
    delete likes[url];
    Storage.setLikes(likes);
    syncAnimeRating(url, 0);
    showToast("\u0414\u0438\u0437\u043B\u0430\u0439\u043A \u0441\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
  } else {
    likes[url] = "dislike";
    Storage.setLikes(likes);
    syncAnimeRating(url, -1);
    showToast("\u0414\u0438\u0437\u043B\u0430\u0439\u043A");
  }
  updateLikeButton();
  updateDislikeButton();
  if (Router.currentRoute === "profile") renderProfilePage3();
}
function buildBottomSheetData() {
  const bindItems = (root, selector, callback) => {
    root?.querySelectorAll(selector).forEach((item) => {
      const activate = () => callback(item.dataset.value);
      item.addEventListener("click", activate);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });
  };
  const sourceList = document.getElementById("bsSourceList");
  if (sourceList) {
    const sources = playerPageSources.length ? playerPageSources : ["ASHDI"];
    sourceList.innerHTML = sources.map((s) => {
      const active = s === playerPageCurrentSource ? " active" : "";
      return `<div class="source-item${active}" data-value="${escapeHtml2(String(s))}" role="button" tabindex="0">${escapeHtml2(String(s))}</div>`;
    }).join("");
    bindItems(sourceList, "[data-value]", (value) => switchProviderSource2(value));
  }
  const dubList = document.getElementById("bsDubList");
  if (dubList && playerPageAnime?.seasons) {
    const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
    const currentSeason = playerPageCurrentSeason || seasons[0] || "1";
    const dubs = Object.keys(playerPageAnime.seasons[currentSeason] || {}).sort();
    dubList.innerHTML = dubs.map((d) => {
      const active = d === playerPageCurrentDub ? " active" : "";
      return `<div class="source-item${active}" data-value="${escapeHtml2(String(d))}" role="button" tabindex="0">${escapeHtml2(String(d))}</div>`;
    }).join("");
    bindItems(dubList, "[data-value]", (value) => selectDubFromSheet(value));
  }
  const seasonList = document.getElementById("bsSeasonList");
  if (seasonList && playerPageAnime?.seasons) {
    const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
    seasonList.innerHTML = seasons.map((s) => {
      const active = s === playerPageCurrentSeason ? " active" : "";
      return `<div class="source-item${active}" data-value="${escapeHtml2(String(s))}" role="button" tabindex="0">\u0421\u0435\u0437\u043E\u043D ${escapeHtml2(String(s))}</div>`;
    }).join("");
    bindItems(seasonList, "[data-value]", (value) => selectSeasonFromSheet(value));
  }
  const qualityRow = document.getElementById("bsQualityRow");
  if (qualityRow) {
    qualityRow.innerHTML = QUALITY_OPTIONS.map((q) => {
      const active = q === playerPageCurrentQuality ? " active" : "";
      return `<div class="quality-item${active}" data-value="${escapeHtml2(String(q))}" role="button" tabindex="0">${escapeHtml2(String(q))}</div>`;
    }).join("");
    bindItems(qualityRow, "[data-value]", (value) => selectQualityFromSheet(value));
  }
}
function openBottomSheet(mode) {
  bottomSheetMode = mode || "full";
  buildBottomSheetData();
  document.getElementById("bottomSheetOverlay").classList.add("open");
}
function closeBottomSheet() {
  document.getElementById("bottomSheetOverlay").classList.remove("open");
}
function openMenuPopover() {
  const overlay = document.getElementById("menuPopoverOverlay");
  if (overlay) overlay.classList.add("visible");
}
function closeMenuPopover() {
  const overlay = document.getElementById("menuPopoverOverlay");
  if (overlay) overlay.classList.remove("visible");
}
function togglePlayerTeamDropdown(e) {
  if (e?.__vakdabTeamSelectorHandled) return;
  if (e) e.__vakdabTeamSelectorHandled = true;
  if (e) {
    e.preventDefault?.();
    e.stopPropagation?.();
  }
  const teamDropdown = document.getElementById("playerTeamDropdown");
  const teamTrigger = document.getElementById("playerTeamSelectorTrigger");
  if (!teamDropdown || !teamTrigger) return;
  const isCurrentlyHidden = teamDropdown.hidden || teamDropdown.hasAttribute("hidden") || teamDropdown.style.display === "none";
  if (isCurrentlyHidden) {
    renderCompactPlayerSelectors();
    teamDropdown.removeAttribute("hidden");
    teamDropdown.hidden = false;
    teamDropdown.style.display = "block";
    teamTrigger.setAttribute("aria-expanded", "true");
    teamTrigger.classList.add("is-open");
  } else {
    closePlayerTeamDropdown();
  }
}
function closePlayerTeamDropdown() {
  const teamDropdown = document.getElementById("playerTeamDropdown");
  const teamTrigger = document.getElementById("playerTeamSelectorTrigger");
  if (teamDropdown) {
    teamDropdown.setAttribute("hidden", "");
    teamDropdown.hidden = true;
    teamDropdown.style.display = "none";
  }
  if (teamTrigger) {
    teamTrigger.setAttribute("aria-expanded", "false");
    teamTrigger.classList.remove("is-open");
  }
}
async function loadAnimeRatingAggregate(animeUrl) {
  const numEl = document.getElementById("playerRatingNum");
  const labelEl = document.getElementById("playerRatingLabel");
  if (!numEl) return;
  numEl.textContent = "\u2014";
  if (labelEl) labelEl.textContent = "\u041E\u0426\u0406\u041D\u041A\u0410 \u0413\u041B\u042F\u0414\u0410\u0427\u0406\u0412";
  try {
    if (!db) return;
    await ensureFirebaseGuestAuth();
    const animeId = String(animeUrl.hashCode ? animeUrl.hashCode() : animeUrl);
    const q = query(collection(db, "anime_ratings"), where("animeId", "==", animeId));
    const snap = await getDocs(q);
    if (snap.empty) {
      numEl.textContent = "\u2014";
      if (labelEl) labelEl.textContent = "\u041D\u0415\u041C\u0410\u0404 \u041E\u0426\u0406\u041D\u041E\u041A";
      return;
    }
    let sum = 0, count = 0;
    snap.forEach((d) => {
      const v = d.data().value;
      if (v === 1 || v === -1) {
        sum += v;
        count++;
      }
    });
    if (count === 0) {
      numEl.textContent = "\u2014";
      if (labelEl) labelEl.textContent = "\u041D\u0415\u041C\u0410\u0404 \u041E\u0426\u0406\u041D\u041E\u041A";
      return;
    }
    const score = (sum / count + 1) / 2 * 10;
    numEl.textContent = score.toFixed(1);
    if (labelEl) labelEl.textContent = `${count} ${count === 1 ? "\u0413\u041E\u041B\u041E\u0421" : "\u0413\u041E\u041B\u041E\u0421\u0406\u0412"}`;
  } catch (e) {
    console.warn("Rating aggregate error:", e);
  }
}
async function syncAnimeRating(animeUrl, value) {
  try {
    if (!db) return;
    await ensureFirebaseGuestAuth();
    const animeId = String(animeUrl.hashCode ? animeUrl.hashCode() : animeUrl);
    const uid = auth?.currentUser?.uid || Storage.getDeviceId?.() || "anon";
    const docId = `${animeId}_${uid}`;
    const ref2 = doc(db, "anime_ratings", docId);
    if (value === 0) {
      await deleteDoc(ref2);
    } else {
      await setDoc(ref2, { animeId, uid, value, updatedAt: Date.now() });
    }
    loadAnimeRatingAggregate(animeUrl);
  } catch (e) {
    console.warn("syncAnimeRating error:", e);
  }
}
function showViewMode(mode) {
  const grid = document.getElementById("episodeViewGrid");
  const compact = document.getElementById("episodeViewCompact");
  const classic = document.getElementById("episodeViewClassic");
  grid.classList.toggle("hidden", mode !== "grid");
  compact.classList.toggle("hidden", mode !== "compact");
  classic.classList.toggle("hidden", mode !== "classic");
  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === mode);
  });
  playerPageCurrentView = mode;
}
var playerPageAnimeuaSeasons, externalSourceCache, playerPageAnime, playerPagePlayer, _playerLoadController, playerPageCurrentSeason, playerPageCurrentDub, playerPageCurrentQuality, playerPagePlaybackRequest, playerPageCurrentAnimeUrl, playerPageCurrentSource, setPlayerPageAnimeuaSeasons, setPlayerPageAnime, setPlayerPageCurrentSeason, setPlayerPageCurrentDub, setPlayerPageCurrentSource, playerPageCurrentView, playerPageEpisodes, playerPageSources, playerPageCurrentEpisodeNum, playerPageHistoryUpdated, playerPageWatchTimeSynced, playerPageLastProgressSave, playerPageWatchStartTime, playerPageAccumulatedWatchSeconds, playerPageLastVideoTime, playerPageIsPlaying, playerPageIsOpen, playerPagePreviousBodyOverflow, playerPagePreviousActiveElement, playerJikanData, playerCharacterItems, playerCharacterExpanded, playerRelatedItems, playerRelatedExpanded, playerMediaItems, playerMediaExpanded, playerCountdownTimer, QUALITY_OPTIONS, RELATED_RELATION_LABELS_UA, RELATED_TYPE_LABELS_UA, relatedLocalizationCache, RELATED_TITLE_OVERRIDES_UA, normalizeRelatedKey, relatedRelationLabelUa, relatedTypeLabelUa, CAST_CHARACTER_NAMES_UA, bottomSheetMode, cpBtn, playerFsBtn, compactEpisodeSelect, teamSwipeStart;
var init_animePlayerPage = __esm({
  "src/js/pages/player/animePlayerPage.js?v=20260927-senplayer-auto-v1"() {
    init_firebase();
    init_client();
    init_constants3();
    init_router();
    init_storage();
    init_lampaPlayer();
    init_senPlayer();
    init_catalog3();
    init_homeLegacy();
    init_profileLegacy();
    init_skeleton();
    init_app_legacy();
    init_feature_loader();
    init_animeExternal();
    init_aniSkip();
    playerPageAnimeuaSeasons = null;
    externalSourceCache = {};
    playerPageAnime = null;
    playerPagePlayer = null;
    _playerLoadController = null;
    playerPageCurrentSeason = "1";
    playerPageCurrentDub = "";
    playerPageCurrentQuality = "1080p";
    playerPagePlaybackRequest = 0;
    playerPageCurrentAnimeUrl = null;
    playerPageCurrentSource = "\u041E\u0441\u043D\u043E\u0432\u043D\u0435";
    setPlayerPageAnimeuaSeasons = (value) => {
      playerPageAnimeuaSeasons = value;
    };
    setPlayerPageAnime = (value) => {
      playerPageAnime = value;
    };
    setPlayerPageCurrentSeason = (value) => {
      playerPageCurrentSeason = value;
    };
    setPlayerPageCurrentDub = (value) => {
      playerPageCurrentDub = value;
    };
    setPlayerPageCurrentSource = (value) => {
      playerPageCurrentSource = value;
    };
    playerPageCurrentView = "grid";
    playerPageEpisodes = [];
    playerPageSources = ["ASHDI"];
    playerPageCurrentEpisodeNum = "1";
    playerPageHistoryUpdated = false;
    playerPageWatchTimeSynced = 0;
    playerPageLastProgressSave = 0;
    playerPageWatchStartTime = 0;
    playerPageAccumulatedWatchSeconds = 0;
    playerPageLastVideoTime = null;
    playerPageIsPlaying = false;
    playerPageIsOpen = false;
    playerPagePreviousBodyOverflow = "";
    playerPagePreviousActiveElement = null;
    playerJikanData = null;
    playerCharacterItems = [];
    playerCharacterExpanded = false;
    playerRelatedItems = [];
    playerRelatedExpanded = false;
    playerMediaItems = [];
    playerMediaExpanded = false;
    playerCountdownTimer = null;
    QUALITY_OPTIONS = ["\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u0430", "2160p (4K)", "1440p", "1080p", "720p", "480p", "360p"];
    window.selectDubFromSheet = selectDubFromSheet;
    window.selectSeasonFromSheet = selectSeasonFromSheet;
    window.selectQualityFromSheet = selectQualityFromSheet;
    RELATED_RELATION_LABELS_UA = {
      "prequel": "\u043F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u044F \u0456\u0441\u0442\u043E\u0440\u0456\u044F",
      "sequel": "\u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0430 \u0456\u0441\u0442\u043E\u0440\u0456\u044F",
      "side story": "\u0441\u043F\u0456\u043D-\u043E\u0444",
      "spin-off": "\u0441\u043F\u0456\u043D-\u043E\u0444",
      "alternative version": "\u0430\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u043D\u0430 \u0432\u0435\u0440\u0441\u0456\u044F",
      "alternative setting": "\u0430\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u043D\u0430 \u0432\u0435\u0440\u0441\u0456\u044F",
      "summary": "\u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u043F\u0435\u0440\u0435\u043A\u0430\u0437",
      "adaptation": "\u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0456\u044F",
      "parent story": "\u043F\u043E\u0432\u2019\u044F\u0437\u0430\u043D\u0438\u0439 \u0442\u0432\u0456\u0440",
      "character": "\u043F\u043E\u0432\u2019\u044F\u0437\u0430\u043D\u0438\u0439 \u0442\u0432\u0456\u0440",
      "full story": "\u043F\u043E\u0432\u043D\u0430 \u0456\u0441\u0442\u043E\u0440\u0456\u044F",
      "other": "\u043F\u043E\u0432\u2019\u044F\u0437\u0430\u043D\u0438\u0439 \u0442\u0432\u0456\u0440"
    };
    RELATED_TYPE_LABELS_UA = {
      "tv": "TV \u0441\u0435\u0440\u0456\u0430\u043B",
      "tv series": "TV \u0441\u0435\u0440\u0456\u0430\u043B",
      "movie": "\u0424\u0456\u043B\u044C\u043C",
      "film": "\u0424\u0456\u043B\u044C\u043C",
      "ova": "OVA",
      "ona": "ONA",
      "special": "\u0421\u043F\u0435\u0448\u043B",
      "tv special": "\u0422\u0412 \u0441\u043F\u0435\u0448\u043B",
      "music": "\u041C\u0443\u0437\u0438\u043A\u0430"
    };
    relatedLocalizationCache = /* @__PURE__ */ new Map();
    RELATED_TITLE_OVERRIDES_UA = {
      "yuusha tokkyuu might gaine": "\u042E\u0443\u0448\u0430 \u0422\u043E\u043A\u043A\u044E\u0443 \u041C\u0430\u0439\u0442\u0456 \u0490\u0435\u0439\u043D",
      "yuusha tokkyuu might gain": "\u042E\u0443\u0448\u0430 \u0422\u043E\u043A\u043A\u044E\u0443 \u041C\u0430\u0439\u0442\u0456 \u0490\u0435\u0439\u043D",
      "code geass: hangyaku no lelouch": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430",
      "code geass: hangyaku no lelouch r2": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430 R2",
      "code geass: hangyaku no lelouch - kiseki no birthday picture drama": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430 \u2014 \u0434\u0440\u0430\u043C\u0430 \xAB\u0414\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F \u041A\u0456\u0441\u0435\u043A\u0456\xBB",
      "code geass: hangyaku no lelouch r2 flash flash - kaette kita baba gekijou": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430 R2 \u2014 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u043F\u0435\u0448\u043B \xAB\u0411\u0430\u0431\u0430 \u0490\u0435\u043A\u0456\u0434\u0436\u043E\xBB",
      "code geass: hangyaku no lelouch r2 flash flash kaette kita baba gekijou": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430 R2 \u2014 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u043F\u0435\u0448\u043B \xAB\u0411\u0430\u0431\u0430 \u0490\u0435\u043A\u0456\u0434\u0436\u043E\xBB",
      "code geass hangyaku no lelouch": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430",
      "code geass hangyaku no lelouch r2": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430 R2",
      "code geass hangyaku no lelouch kiseki no birthday picture drama": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430 \u2014 \u0434\u0440\u0430\u043C\u0430 \xAB\u0414\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F \u041A\u0456\u0441\u0435\u043A\u0456\xBB",
      "code geass hangyaku no lelouch r2 flash flash kaette kita baba gekijou": "\u041A\u043E\u0434 \u0490\u0456\u0430\u0441: \u041F\u043E\u0432\u0441\u0442\u0430\u043D\u043D\u044F \u041B\u0435\u043B\u0443\u0448\u0430 R2 \u2014 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u043F\u0435\u0448\u043B \xAB\u0411\u0430\u0431\u0430 \u0490\u0435\u043A\u0456\u0434\u0436\u043E\xBB"
    };
    normalizeRelatedKey = (value) => String(value || "").toLocaleLowerCase("uk-UA").replace(/[\u2010-\u2015:!?.,'’"()\[\]{}]/g, " ").replace(/\s+/g, " ").trim();
    relatedRelationLabelUa = (value) => RELATED_RELATION_LABELS_UA[String(value || "").trim().toLocaleLowerCase("en-US")] || String(value || "");
    relatedTypeLabelUa = (value) => RELATED_TYPE_LABELS_UA[String(value || "").trim().toLocaleLowerCase("en-US")] || String(value || "");
    CAST_CHARACTER_NAMES_UA = {
      "lelouch": "\u041B\u0435\u043B\u0443\u0448",
      "suzaku": "\u0421\u0443\u0437\u0430\u043A\u0443",
      "c.c.": "C.C.",
      "cc": "C.C.",
      "kallen": "\u041A\u0430\u0440\u0435\u043D",
      "shirley": "\u0428\u0438\u0440\u043B\u0456",
      "nunnally": "\u041D\u0430\u043D\u043D\u0430\u043B\u0456"
    };
    bottomSheetMode = "full";
    window.closeMenuPopover = closeMenuPopover;
    document.getElementById("bnMenu")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openMenuPopover();
    });
    document.getElementById("menuPopoverOverlay")?.addEventListener("click", (e) => {
      if (e.target.id === "menuPopoverOverlay") closeMenuPopover();
    });
    document.querySelectorAll(".menu-popover-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        closeMenuPopover();
        if (action === "settings") {
          Router.goTo("settings");
        } else if (action === "stickers") {
          Router.goTo("stickers");
        } else if (action === "schedule") {
          Router.goTo("schedule");
        } else if (action === "discussions") {
          Router.goTo("discussions");
        } else if (action === "live") {
          document.getElementById("liveStreamContainer")?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (action === "catalog") {
          Router.goTo("main");
          setTimeout(() => document.getElementById("homeCatalogSearch")?.focus(), 180);
        } else if (action === "popular") {
          showTop100();
        } else if (action === "random") {
          openRandomAnime();
        }
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenuPopover();
      }
    });
    document.getElementById("searchCircleBtn")?.addEventListener("click", () => {
      Router.goTo("search");
      setTimeout(() => {
        const inp = document.getElementById("searchPageInput");
        if (inp) inp.focus();
      }, 200);
    });
    document.getElementById("top100Btn")?.addEventListener("click", showTop100);
    document.getElementById("randomBtn")?.addEventListener("click", openRandomAnime);
    document.getElementById("logoHome").addEventListener("click", () => Router.goTo("main"));
    cpBtn = document.getElementById("closePlayerPageBtn");
    if (cpBtn) cpBtn.addEventListener("click", closePlayerPage);
    playerFsBtn = document.getElementById("playerFullscreenBtn");
    if (playerFsBtn) {
      playerFsBtn.addEventListener("click", () => {
        if (playerPagePlayer) {
          playerPagePlayer.toggleFullscreen();
          return;
        }
        const container = document.getElementById("playerVideoContainer");
        if (!container) return;
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
          return;
        }
        return;
      });
    }
    document.getElementById("playerPageModal")?.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || !/t\.me\//i.test(link.href)) return;
      event.preventDefault();
      event.stopPropagation();
      showToast("\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u043E\u0437\u0432\u0443\u0447\u043A\u0443 \u0432 \u043A\u0430\u0440\u0442\u0446\u0456 \u2014 \u043F\u0435\u0440\u0435\u0445\u0456\u0434 \u0443 Telegram \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E");
    }, true);
    compactEpisodeSelect = document.getElementById("playerEpisodeSelect");
    compactEpisodeSelect?.addEventListener("change", () => {
      const episode = getCurrentEpisodes().find((ep) => String(ep.episode) === String(compactEpisodeSelect.value));
      if (episode && episode.file) {
        playerPageCurrentEpisodeNum = episode.episode;
        setAccordionSummary("playerEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${episode.episode}`);
        setAccordionSummary("playerCompactEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${episode.episode}`);
        renderAllEpisodeViews(getCurrentEpisodes());
        playEpisode(episode.file, episode.episode);
      }
    });
    document.getElementById("playerDubSelect")?.addEventListener("change", (event) => selectDubFromSheet(event.target.value));
    initPlayerAccordions();
    initCompactAccordions();
    document.getElementById("playerSeasonSelect")?.addEventListener("change", (event) => selectSeasonFromSheet(event.target.value));
    window.togglePlayerTeamDropdown = togglePlayerTeamDropdown;
    window.closePlayerTeamDropdown = closePlayerTeamDropdown;
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest?.("#playerTeamSelectorTrigger");
      if (trigger) {
        return;
      }
      const option = e.target.closest?.("#playerTeamDropdown [data-dub], #playerTeamDropdown [data-season]");
      if (option) {
        e.stopPropagation();
        if (option.hasAttribute("data-dub")) selectDubFromSheet(option.dataset.dub);
        else selectSeasonFromSheet(option.dataset.season);
        closePlayerTeamDropdown();
        return;
      }
      const dropdown = document.getElementById("playerTeamDropdown");
      const currentTrigger = document.getElementById("playerTeamSelectorTrigger");
      if (dropdown && !dropdown.hidden && dropdown.style.display !== "none" && !dropdown.contains(e.target) && !currentTrigger?.contains(e.target)) {
        closePlayerTeamDropdown();
      }
    });
    teamSwipeStart = null;
    document.addEventListener("touchstart", (e) => {
      const card = e.target.closest?.("#playerTeamSelectorTrigger");
      if (!card || e.touches.length !== 1) return;
      const touch = e.touches[0];
      teamSwipeStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    document.addEventListener("touchend", (e) => {
      if (!teamSwipeStart) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - teamSwipeStart.x;
      const dy = touch.clientY - teamSwipeStart.y;
      teamSwipeStart = null;
      if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
      const seasonData = playerPageAnime?.seasons?.[playerPageCurrentSeason] || {};
      const dubs = Object.keys(seasonData).sort();
      if (dubs.length < 2) return;
      const currentIndex = Math.max(0, dubs.indexOf(playerPageCurrentDub));
      const nextIndex = dx < 0 ? (currentIndex + 1) % dubs.length : (currentIndex - 1 + dubs.length) % dubs.length;
      selectDubFromSheet(dubs[nextIndex], dx < 0 ? -1 : 1);
    }, { passive: true });
    document.addEventListener("keydown", (e) => {
      const trigger = e.target.closest?.("#playerTeamSelectorTrigger");
      if (!trigger || e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      togglePlayerTeamDropdown(e);
    });
    document.getElementById("playerEpisodesBookmarkBtn")?.addEventListener("click", toggleBookmark);
    document.getElementById("playerPrevEpisode")?.addEventListener("click", () => {
      const episodes = getCurrentEpisodes();
      const index = episodes.findIndex((ep) => String(ep.episode) === String(playerPageCurrentEpisodeNum));
      const episode = episodes[index - 1];
      if (episode && episode.file) {
        playerPageCurrentEpisodeNum = episode.episode;
        setAccordionSummary("playerEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${episode.episode}`);
        setAccordionSummary("playerCompactEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${episode.episode}`);
        renderAllEpisodeViews(episodes);
        playEpisode(episode.file, episode.episode);
      }
    });
    document.getElementById("playerNextEpisode")?.addEventListener("click", () => {
      const episodes = getCurrentEpisodes();
      const index = episodes.findIndex((ep) => String(ep.episode) === String(playerPageCurrentEpisodeNum));
      const episode = episodes[index + 1];
      if (episode && episode.file) {
        playerPageCurrentEpisodeNum = episode.episode;
        setAccordionSummary("playerEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${episode.episode}`);
        setAccordionSummary("playerCompactEpisodeSummary", `\u0421\u0435\u0440\u0456\u044F ${episode.episode}`);
        renderAllEpisodeViews(episodes);
        playEpisode(episode.file, episode.episode);
      }
    });
    document.getElementById("playerSourceChip").addEventListener("click", () => {
      openBottomSheet("source");
    });
    document.getElementById("playerFilterBtn").addEventListener("click", () => {
      openBottomSheet("full");
    });
    document.getElementById("bsApplyBtn").addEventListener("click", () => {
      closeBottomSheet();
      if (bottomSheetMode === "source") {
        showToast(`\u0414\u0436\u0435\u0440\u0435\u043B\u043E \u0432\u0456\u0434\u0435\u043E: ${playerPageCurrentSource}`);
      } else {
        showToast("\u0424\u0456\u043B\u044C\u0442\u0440\u0438 \u0437\u0430\u0441\u0442\u043E\u0441\u043E\u0432\u0430\u043D\u043E");
      }
    });
    document.getElementById("bottomSheetOverlay").addEventListener("click", function(e) {
      if (e.target === this) closeBottomSheet();
    });
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const mode = tab.dataset.view;
        showViewMode(mode);
      });
    });
    document.getElementById("mainCharactersMoreBtn")?.addEventListener("click", () => {
      playerCharacterExpanded = !playerCharacterExpanded;
      renderMainCharacters(playerJikanData);
    });
    document.getElementById("mediaMoreBtn")?.addEventListener("click", () => {
      playerMediaExpanded = !playerMediaExpanded;
      renderAnimeMedia(playerJikanData);
    });
    document.getElementById("relatedMoreBtn")?.addEventListener("click", () => {
      playerRelatedExpanded = !playerRelatedExpanded;
      const list = document.getElementById("relatedList");
      const more = document.getElementById("relatedMoreBtn");
      if (!list) return;
      const visible = playerRelatedExpanded ? playerRelatedItems : playerRelatedItems.slice(0, 4);
      list.innerHTML = visible.map(relatedCardMarkup).join("");
      list.querySelectorAll(".related-card").forEach((card) => card.addEventListener("click", () => openRelatedAnimeInPlayer(card)));
      if (more) {
        more.hidden = playerRelatedItems.length <= 4;
        more.textContent = playerRelatedExpanded ? "\u2190" : "\u2192";
      }
    });
    document.getElementById("likeBtn")?.addEventListener("click", toggleLike);
    document.getElementById("dislikeBtn")?.addEventListener("click", toggleDislike);
    document.getElementById("playerBookmarkBtn")?.addEventListener("click", toggleBookmark);
    document.getElementById("playerToolbarBookmark")?.addEventListener("click", toggleBookmark);
    document.getElementById("playerToolbarShare")?.addEventListener("click", () => {
      const url = playerPageCurrentAnimeUrl;
      const title = playerPageAnime?.title || "VakDab";
      if (navigator.share) navigator.share({ title, text: title, url: location.href }).catch(() => {
      });
      else navigator.clipboard?.writeText(location.href).then(() => showToast("\u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0441\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E")).catch(() => showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0441\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F"));
    });
    document.getElementById("videoBackBtn")?.addEventListener("click", () => {
      const videoContainer = document.getElementById("playerVideoContainer");
      videoContainer.classList.remove("active");
      if (playerPagePlayer) {
        try {
          playerPagePlayer.destroy();
        } catch (e) {
        }
        playerPagePlayer = null;
      }
      document.getElementById("playerPageVideo").innerHTML = "";
    });
    document.getElementById("playerPageModal")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closePlayerPage();
    });
    document.getElementById("playerShareBtn")?.addEventListener("click", shareAnime);
    document.getElementById("watchBackBtn")?.addEventListener("click", closeWatchPage);
    document.getElementById("watchSourcePill")?.addEventListener("click", () => openBottomSheet("source"));
    document.getElementById("watchFilterPill")?.addEventListener("click", () => openBottomSheet("full"));
    window.showViewMode = showViewMode;
  }
});
