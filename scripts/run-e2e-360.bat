@echo off
echo Running 360px E2E Test...
call npx agent-browser open http://localhost:3004/analysis/1
call npx agent-browser set viewport 360 740
call npx agent-browser wait 1000
call npx agent-browser click [data-testid=matching-sticky-cta]
call npx agent-browser wait 600
call npx agent-browser screenshot docs/v360-step1.png

echo Step 1 pyeong switch on 360px...
call npx agent-browser click [data-testid=btn-select-pyeong-34]
call npx agent-browser wait 300
call npx agent-browser click [data-testid=modal-step1-next]
call npx agent-browser wait 600

echo Step 2 tenant occupancy on 360px...
call npx agent-browser click [data-testid=btn-occupancy-TENANT]
call npx agent-browser wait 300
call npx agent-browser fill [data-testid=input-tenant-phone] 01033337777
call npx agent-browser wait 200
call npx agent-browser click [data-testid=chk-tenant-notified]
call npx agent-browser wait 200
call npx agent-browser screenshot docs/v360-step2.png
call npx agent-browser click [data-testid=modal-step2-next]
call npx agent-browser wait 600

echo Step 3 dong and ho on 360px...
call npx agent-browser screenshot docs/v360-step3.png
call npx agent-browser click [data-testid=modal-step3-next]
call npx agent-browser wait 600

echo Step 4 SMS auth on 360px...
call npx agent-browser click [data-testid=btn-send-sms]
call npx agent-browser wait 300
call npx agent-browser click [data-testid=btn-autofill-sms]
call npx agent-browser wait 500
call npx agent-browser screenshot docs/v360-step4.png
call npx agent-browser click [data-testid=modal-step4-next]
call npx agent-browser wait 600

echo Step 5 preview and pledges on 360px...
call npx agent-browser click [data-testid=chk-sole-owner]
call npx agent-browser wait 200
call npx agent-browser click [data-testid=chk-legal-pledge]
call npx agent-browser wait 300
call npx agent-browser screenshot docs/v360-step5.png
call npx agent-browser click [data-testid=modal-step5-submit]
call npx agent-browser wait 800

echo Step 6 receipt on 360px...
call npx agent-browser screenshot docs/v360-step6.png
call npx agent-browser eval "document.documentElement.scrollWidth > window.innerWidth"
echo Finished 360px E2E Test!
