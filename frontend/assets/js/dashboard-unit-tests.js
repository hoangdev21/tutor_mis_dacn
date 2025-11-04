/**
 * Unit Tests for Tutor Dashboard
 * File: dashboard-unit-tests.js
 */

class DashboardTestSuite {
    constructor() {
        this.results = [];
        this.API_BASE_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000/api'
            : 'https://tutormis-backend.onrender.com/api';
    }

    // Utility function to log results
    logTest(name, passed, message = '') {
        this.results.push({
            name,
            passed,
            message,
            timestamp: new Date().toLocaleTimeString()
        });
        console.log(`${passed ? '✅' : '❌'} ${name}: ${message}`);
    }

    // Test 1: formatCurrency function
    testFormatCurrency() {
        console.log('\n=== Test formatCurrency ===');
        
        try {
            const test1 = formatCurrency(1000000);
            this.logTest('formatCurrency - 1M', test1.includes('1') && test1.includes('000'), `Result: ${test1}`);
            
            const test2 = formatCurrency(0);
            this.logTest('formatCurrency - 0', test2.includes('0'), `Result: ${test2}`);
            
            const test3 = formatCurrency(undefined);
            this.logTest('formatCurrency - undefined', test3.includes('0'), `Result: ${test3}`);
            
            return true;
        } catch (error) {
            this.logTest('formatCurrency', false, error.message);
            return false;
        }
    }

    // Test 2: formatDate function
    testFormatDate() {
        console.log('\n=== Test formatDate ===');
        
        try {
            const date = new Date();
            const result = formatDate(date.toISOString());
            this.logTest('formatDate', result.length > 0, `Result: ${result}`);
            
            return true;
        } catch (error) {
            this.logTest('formatDate', false, error.message);
            return false;
        }
    }

    // Test 3: formatRelativeTime function
    testFormatRelativeTime() {
        console.log('\n=== Test formatRelativeTime ===');
        
        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
            const result = formatRelativeTime(fiveMinutesAgo.toISOString());
            this.logTest('formatRelativeTime', result.includes('phút'), `Result: ${result}`);
            
            return true;
        } catch (error) {
            this.logTest('formatRelativeTime', false, error.message);
            return false;
        }
    }

    // Test 4: updateStats function
    testUpdateStats() {
        console.log('\n=== Test updateStats ===');
        
        try {
            const mockStats = {
                totalStudents: 10,
                activeStudents: 5,
                monthlyIncome: 50000000,
                predictedIncome: 75000000,
                averageRating: 4.8,
                totalReviews: 25,
                unreadMessages: 3,
                availableRequests: 2
            };
            
            updateStats(mockStats);
            
            const totalStudentsEl = document.getElementById('totalStudents');
            const monthlyIncomeEl = document.getElementById('monthlyIncome');
            
            const check1 = totalStudentsEl && totalStudentsEl.textContent === '10';
            const check2 = monthlyIncomeEl && monthlyIncomeEl.textContent.includes('50');
            
            this.logTest('updateStats - totalStudents', check1, `Expected: 10, Got: ${totalStudentsEl?.textContent}`);
            this.logTest('updateStats - monthlyIncome', check2, `Contains "50": ${monthlyIncomeEl?.textContent}`);
            
            return true;
        } catch (error) {
            this.logTest('updateStats', false, error.message);
            return false;
        }
    }

    // Test 5: renderRecentStudents function
    testRenderRecentStudents() {
        console.log('\n=== Test renderRecentStudents ===');
        
        try {
            const mockStudents = [
                {
                    _id: '1',
                    studentId: '101',
                    studentName: 'Học Sinh 1',
                    subject: 'Toán',
                    level: 'THPT',
                    status: 'accepted',
                    startDate: new Date().toISOString(),
                    totalAmount: 4000000
                },
                {
                    _id: '2',
                    studentId: '102',
                    studentName: 'Học Sinh 2',
                    subject: 'Anh',
                    level: 'THCS',
                    status: 'completed',
                    startDate: new Date().toISOString(),
                    totalAmount: 3500000
                }
            ];
            
            renderRecentStudents(mockStudents);
            
            const container = document.getElementById('studentsContainer');
            const rendered = container.innerHTML.length > 0;
            const hasStudents = container.innerHTML.includes('Học Sinh 1');
            
            this.logTest('renderRecentStudents - rendered', rendered, 'HTML content created');
            this.logTest('renderRecentStudents - contains data', hasStudents, 'Student names found');
            
            return true;
        } catch (error) {
            this.logTest('renderRecentStudents', false, error.message);
            return false;
        }
    }

    // Test 6: renderNewRequests function
    testRenderNewRequests() {
        console.log('\n=== Test renderNewRequests ===');
        
        try {
            const mockRequests = [
                {
                    _id: '1',
                    studentId: '101',
                    studentName: 'Yêu Cầu 1',
                    subject: 'Toán',
                    level: 'THPT',
                    budget: 200000,
                    teachingMethod: 'online',
                    address: 'Hà Nội',
                    createdAt: new Date().toISOString()
                }
            ];
            
            renderNewRequests(mockRequests);
            
            const container = document.getElementById('requestsContainer');
            const rendered = container.innerHTML.length > 0;
            const hasRequests = container.innerHTML.includes('Yêu Cầu 1');
            
            this.logTest('renderNewRequests - rendered', rendered, 'HTML content created');
            this.logTest('renderNewRequests - contains data', hasRequests, 'Request data found');
            
            return true;
        } catch (error) {
            this.logTest('renderNewRequests', false, error.message);
            return false;
        }
    }

    // Test 7: renderUpcomingSchedule function
    testRenderUpcomingSchedule() {
        console.log('\n=== Test renderUpcomingSchedule ===');
        
        try {
            const mockSchedule = [
                {
                    _id: '1',
                    studentId: '101',
                    studentName: 'Lịch 1',
                    subject: 'Tiếng Anh',
                    level: 'THPT',
                    startDate: new Date().toISOString(),
                    preferredTime: '19:00 - 20:00',
                    daysPerWeek: 2,
                    hoursPerSession: 1,
                    location: 'Trực tuyến'
                }
            ];
            
            renderUpcomingSchedule(mockSchedule);
            
            const container = document.getElementById('scheduleContainer');
            const rendered = container.innerHTML.length > 0;
            const hasSchedules = container.innerHTML.includes('Lịch 1');
            
            this.logTest('renderUpcomingSchedule - rendered', rendered, 'HTML content created');
            this.logTest('renderUpcomingSchedule - contains data', hasSchedules, 'Schedule data found');
            
            return true;
        } catch (error) {
            this.logTest('renderUpcomingSchedule', false, error.message);
            return false;
        }
    }

    // Test 8: renderNotifications function
    testRenderNotifications() {
        console.log('\n=== Test renderNotifications ===');
        
        try {
            const mockNotifications = [
                {
                    _id: '1',
                    senderName: 'Hệ Thống',
                    content: 'Thông báo test',
                    isRead: false,
                    createdAt: new Date().toISOString()
                }
            ];
            
            renderNotifications(mockNotifications);
            
            const container = document.getElementById('notificationsContainer');
            const rendered = container.innerHTML.length > 0;
            const hasNotifications = container.innerHTML.includes('Thông báo test');
            
            this.logTest('renderNotifications - rendered', rendered, 'HTML content created');
            this.logTest('renderNotifications - contains data', hasNotifications, 'Notification data found');
            
            return true;
        } catch (error) {
            this.logTest('renderNotifications', false, error.message);
            return false;
        }
    }

    // Test 9: Test with real API
    async testRealAPI() {
        console.log('\n=== Test Real API ===');
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.logTest('testRealAPI - token', false, 'No token found');
                return false;
            }
            
            const response = await fetch(`${this.API_BASE_URL}/tutor/dashboard?period=month`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            this.logTest('testRealAPI - status', response.ok, `Status: ${response.status}`);
            
            const data = await response.json();
            
            this.logTest('testRealAPI - success', data.success, `Message: ${data.message}`);
            
            if (data.success && data.data) {
                const has_stats = !!data.data.stats;
                const has_chart = !!data.data.incomeChartData;
                const has_students = Array.isArray(data.data.recentStudents);
                
                this.logTest('testRealAPI - stats', has_stats, 'Stats data present');
                this.logTest('testRealAPI - chart data', has_chart, 'Income chart data present');
                this.logTest('testRealAPI - students', has_students, `${data.data.recentStudents.length} students`);
            }
            
            return true;
        } catch (error) {
            this.logTest('testRealAPI', false, error.message);
            return false;
        }
    }

    // Test 10: DOM elements exist
    testDOMElements() {
        console.log('\n=== Test DOM Elements ===');
        
        const elements = [
            'totalStudents',
            'activeStudents',
            'monthlyIncome',
            'predictedIncome',
            'availableRequests',
            'averageRating',
            'totalReviews',
            'studentsContainer',
            'requestsContainer',
            'scheduleContainer',
            'notificationsContainer',
            'incomeChart',
            'incomeChartPeriod',
            'currentDate',
            'notificationBadge'
        ];
        
        elements.forEach(id => {
            const el = document.getElementById(id);
            this.logTest(`DOM - ${id}`, !!el, el ? 'Found' : 'NOT FOUND');
        });
        
        return true;
    }

    // Run all tests
    async runAllTests() {
        console.clear();
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║       TUTOR DASHBOARD TEST SUITE                       ║');
        console.log('║       ' + new Date().toLocaleString('vi-VN') + '                    ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        
        this.testDOMElements();
        this.testFormatCurrency();
        this.testFormatDate();
        this.testFormatRelativeTime();
        this.testUpdateStats();
        this.testRenderRecentStudents();
        this.testRenderNewRequests();
        this.testRenderUpcomingSchedule();
        this.testRenderNotifications();
        await this.testRealAPI();
        
        this.printSummary();
    }

    // Print summary
    printSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║              TEST SUMMARY                              ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log(`║  Total Tests:   ${total.toString().padEnd(40)} ║`);
        console.log(`║  Passed:        ${passed.toString().padEnd(40)} ║`);
        console.log(`║  Failed:        ${failed.toString().padEnd(40)} ║`);
        console.log(`║  Success Rate:  ${((passed / total) * 100).toFixed(1)}%${' '.repeat(35)} ║`);
        console.log('╚════════════════════════════════════════════════════════╝');
        
        if (failed === 0) {
            console.log('\n✅ ALL TESTS PASSED! Dashboard is ready to use.');
        } else {
            console.log(`\n⚠️  ${failed} test(s) failed. Please check the details above.`);
        }
        
        return {
            total,
            passed,
            failed,
            successRate: ((passed / total) * 100).toFixed(1)
        };
    }
}

// Export for use
window.DashboardTestSuite = DashboardTestSuite;

// Auto-run if in debug mode
if (localStorage.getItem('debugMode') === 'true') {
    const suite = new DashboardTestSuite();
    suite.runAllTests().then(() => {
        console.log('\nTest suite completed. Type: suite.results to see detailed results.');
        window.suite = suite;
    });
}
