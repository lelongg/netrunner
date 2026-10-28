# Learned evaluation fit

121298 positions from 7800 games · train 97301, holdout 23997 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.528 | 0.630 | 73.1 % | 67.5 % |
| holdout | 0.513 | 0.628 | 74.4 % | 67.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 6210 | 0.614 | 67.2 % |
| turns 5-8 | 5993 | 0.553 | 72.0 % |
| turns 9-12 | 5482 | 0.478 | 77.3 % |
| turns 13+ | 6312 | 0.408 | 81.3 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.399 |
| deck:core-nbn | -0.265 |
| runnerPointsToWin | +0.209 |
| runnerPoints | -0.209 |
| deck:core-weyland | +0.198 |
| points | +0.176 |
| pointsToWin | -0.176 |
| threatGain | +0.157 |
| rdDensity | -0.129 |
| hqIce | +0.128 |
| deck:core-hb | +0.123 |
| remoteProgress | +0.123 |
| remoteAgendaPoints | +0.122 |
| runnerCoverage | -0.121 |
| deck:core-shaper | +0.106 |
| agendasInHand | -0.088 |
| deck | +0.087 |
| remotes | -0.078 |
| deck:core-anarch | -0.075 |
| archivesAgendas | -0.071 |
| runnerBreakers | -0.067 |
| creditLead | +0.066 |
| oddsRD | -0.064 |
| deck:core-jinteki | -0.060 |
| runnerCredits | -0.059 |
| remoteIce | +0.051 |
| runnerTags | +0.049 |
| remoteUnrezzed | +0.049 |
| agendaPointsInHand | -0.047 |
| threatLoss | -0.045 |
| hand | +0.043 |
| hqUnrezzed | +0.043 |
| rdIce | +0.042 |
| rezDebt | +0.035 |
| credits | +0.033 |
| deck:core-criminal | -0.032 |
| oddsRemote | +0.028 |
| rdUnrezzed | -0.027 |
| turn | +0.026 |
| unfunded | -0.014 |
| runnerHand | -0.014 |
| runnerRig | -0.014 |
| economyAssets | +0.010 |
| oddsHQ | -0.002 |
| badPub | +0.000 |
