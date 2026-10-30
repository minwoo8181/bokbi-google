@echo off
echo Starting 390px E2E Test...
call npx agent-browser open http://localhost:3004/analysis/1
call npx agent-browser set viewport 390 844
call npx agent-browser wait 1000
call npx agent-browser click [data-testid=matching-sticky-cta]
call npx agent-browser wait 600
call npx agent-browser screenshot docs/v390-step1.png

echo Step 1: testing pyeong switch...
call npx agent-browser click [data-testid=btn-select-pyeong-34]
call npx agent-browser wait 300
call npx agent-browser click [data-testid=modal-step1-next]
call npx agent-browser wait 600

echo Step 2: testing tenant occupancy...
call npx agent-browser click [data-testid=btn-occupancy-TENANT]
call npx agent-browser wait 300
call npx agent-browser fill [data-testid=input-tenant-phone] 01099998888
call npx agent-browser wait 200
call npx agent-browser click [data-testid=chk-tenant-notified]
call npx agent-browser wait 200
call npx agent-browser fill [data-testid=input-visit-memo] "weekday after 7pm"
call npx agent-browser wait 300
call npx agent-browser screenshot docs/v390-step2.png
call npx agent-browser click [data-testid=modal-step2-next]
call npx agent-browser wait 600

echo Step 3: dong and ho...
call npx agent-browser screenshot docs/v390-step3.png
call npx agent-browser click [data-testid=modal-step3-next]
call npx agent-browser wait 600

echo Step 4: sms auth...
call npx agent-browser click [data-testid=btn-send-sms]
call npx agent-browser wait 300
call npx agent-browser click [data-testid=btn-autofill-sms]
call npx agent-browser wait 500
call npx agent-browser screenshot docs/v390-step4.png
call npx agent-browser click [data-testid=modal-step4-next]
call npx agent-browser wait 600

echo Step 5: preview and pledges...
call npx agent-browser click [data-testid=chk-sole-owner]
call npx agent-browser wait 200
call npx agent-browser click [data-testid=chk-legal-pledge]
call npx agent-browser wait 300
call npx agent-browser screenshot docs/v390-step5.png
call npx agent-browser click [data-testid=modal-step5-submit]
call npx agent-browser wait 800

echo Step 6: receipt...
call npx agent-browser screenshot docs/v390-step6.png
echo Finished 390px E2E Test!
