ARG=$1
if [ $ARG == "start" ]; then
    timestamp=`date "+%Y-%m-%d-%H:%M:%S"`
    /usr/local/bin/nfd-start &>/tmp/nfd-"$timestamp".log
    sleep 3
    /usr/local/bin/nfdc register /catalog/sync/1D2073197F88A98A31C95E94F3D6286EBE48A4713497CB095A871C6B64E384525045 udp://atmos-lbl.es.net
    /usr/local/bin/nfdc register /ndn/broadcast udp://atmos-lbl.es.net
fi

if [ $ARG == "stop" ]; then
    /usr/local/bin/nfd-stop
fi
